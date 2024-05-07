"""Functionality for splitting text."""
from __future__ import annotations

import os
from typing import Any, Optional, cast
import re
from core.model_manager import ModelInstance
from core.model_runtime.model_providers.__base.text_embedding_model import TextEmbeddingModel
from core.model_runtime.model_providers.__base.tokenizers.gpt2_tokenzier import GPT2Tokenizer
from core.splitter.text_splitter import (
    TS,
    Collection,
    Literal,
    RecursiveCharacterTextSplitter,
    Set,
    TokenTextSplitter,
    Union,
)


class EnhanceRecursiveCharacterTextSplitter(RecursiveCharacterTextSplitter):
    """
        This class is used to implement from_gpt2_encoder, to prevent using of tiktoken
    """

    @classmethod
    def from_encoder(
            cls: type[TS],
            embedding_model_instance: Optional[ModelInstance],
            allowed_special: Union[Literal[all], Set[str]] = set(),
            disallowed_special: Union[Literal[all], Collection[str]] = "all",
            **kwargs: Any,
    ):
        def _token_encoder(text: str) -> int:
            if not text:
                return 0

            if embedding_model_instance:
                embedding_model_type_instance = embedding_model_instance.model_type_instance
                embedding_model_type_instance = cast(TextEmbeddingModel, embedding_model_type_instance)
                return embedding_model_type_instance.get_num_tokens(
                    model=embedding_model_instance.model,
                    credentials=embedding_model_instance.credentials,
                    texts=[text]
                )
            else:
                return GPT2Tokenizer.get_num_tokens(text)

        if issubclass(cls, TokenTextSplitter):
            extra_kwargs = {
                "model_name": embedding_model_instance.model if embedding_model_instance else 'gpt2',
                "allowed_special": allowed_special,
                "disallowed_special": disallowed_special,
            }
            kwargs = {**kwargs, **extra_kwargs}

        return cls(length_function=_token_encoder, **kwargs)


class FixedRecursiveCharacterTextSplitter(EnhanceRecursiveCharacterTextSplitter):
    def __init__(self, fixed_separator: str = "\n\n", separators: Optional[list[str]] = None, **kwargs: Any):
        """Create a new TextSplitter."""
        super().__init__(**kwargs)
        self._fixed_separator = fixed_separator
        self._separators = separators or ["\n\n", "\n", " ", ""]

    def split_text(self, text: str) -> list[str]:
        """Split incoming text and return chunks."""
        if self._fixed_separator:
            chunks = text.split(self._fixed_separator)
        else:
            chunks = list(text)

        # 先一定程度上拆散(越散,后面合并时越能契合分块大小的参数要求),后面再合
        limit = self._chunk_size * 2 * 0.3

        # 大段落拆分
        final_chunks = []
        for chunk in chunks:
            if self._length_function(chunk) > limit:
                simple_chunks = self.chunk_split_text(chunk,limit)
                if len(simple_chunks) > 0:
                    simple_chunks[-1] = simple_chunks[-1] + self._fixed_separator
                final_chunks.extend(simple_chunks)
            else:
                if len(chunk.strip()) > 0:
                    final_chunks.append(chunk + self._fixed_separator)

        # 乘以2是中文问题, 设置0.7这个参数， 因为是按块合并,肯定会超过这个值,并且后面还有overlap加进来
        limit = self._chunk_size * 2 * 0.7

        # 段落合并：从左向右合并
        final_chunks1 = []

        handled_set = set()
        close = True
        chunk = ""

        for i in range(0,len(final_chunks)):
            if i not in handled_set:
                close = False
                handled_set.add(i)
                chunk = final_chunks[i]
                if self._length_function(chunk) >= limit:
                    final_chunks1.append(chunk)
                    close = True
                    continue
                else:
                    for j in range(i+1, len(final_chunks)):
                        if self._length_function(chunk) < limit:
                            chunk  = chunk  + final_chunks[j]
                            handled_set.add(j)
                        else:
                            final_chunks1.append(chunk)
                            close = True
                            break
        if not close:
            final_chunks1.append(chunk)


        # 是否需要对 final_chunks1 二次均衡,最后一个分块可能会小？
        final_chunks2 = final_chunks1

        # overlap逻辑,至少不能把短句拆开
        pattern = re.compile(r'[，。！？；,、（(）)]')
        left_overlop_dict = {}
        right_overlop_dict = {}
        for i in range(0,len(final_chunks2)):
            current_chunk = final_chunks2[i]
            small_sentences = pattern.split(current_chunk) #以小短句为单位进行overlap
            left_overlop = ""
            symbol_index = 0
            for sen in small_sentences:
                symbol_index = symbol_index + len(sen)
                if len(left_overlop) < self._chunk_overlap:
                    left_overlop = left_overlop + sen
                    if symbol_index < len(current_chunk):
                        left_overlop = left_overlop + current_chunk[symbol_index] # 右边的标点符号加上
                        symbol_index = symbol_index + 1
                else:
                    break
            left_overlop_dict[i] = left_overlop
            small_sentences.reverse()
            right_overlop = ""
            symbol_index = len(current_chunk) - 1
            for sen in small_sentences:
                symbol_index = symbol_index - len(sen)
                if len(right_overlop) < self._chunk_overlap:
                    right_overlop = sen + right_overlop
                    if symbol_index > -1 :
                        right_overlop =  current_chunk[symbol_index] + right_overlop # 左边的标点符号加上
                        symbol_index = symbol_index - 1
                else:
                    break
            right_overlop_dict[i] = right_overlop

        final_chunks3 = []
        for i in range(0, len(final_chunks2)):
            current_chunk = final_chunks2[i]
            left_overlop = ""
            right_overlop = ""
            if i > 0:
                right_overlop = right_overlop_dict[i-1]
            if i < len(final_chunks2) - 1:
                left_overlop = left_overlop_dict[i+1]
            current_chunk_after_overlop = right_overlop  + current_chunk  + left_overlop
            final_chunks3.append(current_chunk_after_overlop)


        return final_chunks3

    def chunk_split_text(self, text: str,limit:int) -> list[str]:
        """这里简单切分即可,后面的overlap逻辑会有寻找标点符号"""
        texts = []
        chunk = ""
        for ch in text:
            if self._length_function(chunk) >= limit:
                texts.append(chunk)
                chunk = ch
            else:
                chunk = chunk + ch
        if len(chunk) > 0:
            texts.append(chunk)
        return texts

    def recursive_split_text(self, text: str) -> list[str]:
        """Split incoming text and return chunks."""
        final_chunks = []
        # Get appropriate separator to use
        separator = self._separators[-1]
        for _s in self._separators:
            if _s == "":
                separator = _s
                break
            if _s in text:
                separator = _s
                break
        # Now that we have the separator, split the text
        if separator:
            splits = text.split(separator)
        else:
            splits = list(text)
        # Now go merging things, recursively splitting longer texts.
        _good_splits = []
        for s in splits:
            if self._length_function(s) < self._chunk_size:
                _good_splits.append(s)
            else:
                if _good_splits:
                    merged_text = self._merge_splits(_good_splits, separator)
                    final_chunks.extend(merged_text)
                    _good_splits = []
                other_info = self.recursive_split_text(s)
                final_chunks.extend(other_info)
        if _good_splits:
            merged_text = self._merge_splits(_good_splits, separator)
            final_chunks.extend(merged_text)
        return final_chunks
