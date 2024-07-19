import type { FC } from 'react'
import React, {
  memo, useCallback, useMemo,
  useRef,
  useState,
} from 'react'
import { useContext } from 'use-context-selector'
import Recorder from 'js-audio-recorder'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import cn from 'classnames'
import useSWR from 'swr'
import type {
  EnableType,
  OnSend,
  VisionConfig,
} from '../types'
import { TransferMethod } from '../types'
import { useChatWithHistoryContext } from '../chat-with-history/context'
import { useChatContext } from './context'
import TooltipPlus from '@/app/components/base/tooltip-plus'
import { ToastContext } from '@/app/components/base/toast'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import VoiceInput from '@/app/components/base/voice-input'
import { Microphone01 } from '@/app/components/base/icons/src/vender/line/mediaAndDevices'
import { Microphone01 as Microphone01Solid } from '@/app/components/base/icons/src/vender/solid/mediaAndDevices'
import { XCircle } from '@/app/components/base/icons/src/vender/solid/general'
// import { FileUpload } from '@/app/components/base/icons/src/vender/line/files'
import { FileUpload } from '@/app/components/base/icons/src/vender/line/files'
import { Send03 } from '@/app/components/base/icons/src/vender/solid/communication'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import {
  useClipboardUploader,
  useDraggableUploader,
  useImageFiles,
} from '@/app/components/base/image-uploader/hooks'

// import ChatFileUploader from '@/app/components/base/file-uploader/chat-file-uploader'
import Tooltip from '@/app/components/base/tooltip'
import I18n from '@/context/i18n'
import { LanguagesSupported } from '@/i18n/language'
import type { CustomFile as File, FileItem, IndexingStatusResponse } from '@/models/datasets'

import s from '@/app/components/datasets/create/file-uploader/index.module.css'
import { upload_in_app } from '@/service/base'
import { fetchFileUploadConfig } from '@/service/common'

// import { fetchIndexingStatusBatchByUrl as doFetchIndexingStatus, fetchIndexingEstimateBatch, fetchProcessRule } from '@/service/datasets'
import { fetchIndexingStatusBatchByUrl as doFetchIndexingStatus } from '@/service/datasets'

const FILES_NUMBER_LIMIT = 20

type ChatInputProps = {
  visionConfig?: VisionConfig
  speechToTextConfig?: EnableType
  onSend?: OnSend
}
const ChatInput: FC<ChatInputProps> = ({
  visionConfig,
  speechToTextConfig,
  onSend,
}) => {
  const {
    conversationId,
  } = useChatContext()
  // console.log('conversationId:', conversationId)

  const {
    appData,
    currentConversationId,
    currentConversationItem,
  } = useChatWithHistoryContext()
  // console.log('currentConversationId:', currentConversationId)
  const { t } = useTranslation()
  const { notify } = useContext(ToastContext)
  const [voiceInputShow, setVoiceInputShow] = useState(false)
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()
  const { onPaste } = useClipboardUploader({ onUpload, visionConfig, files })
  const { onDragEnter, onDragLeave, onDragOver, onDrop, isDragActive } = useDraggableUploader<HTMLTextAreaElement>({ onUpload, files, visionConfig })
  const isUseInputMethod = useRef(false)
  const [query, setQuery] = useState('')
  const [tmpDatasetId, setTmpDatasetId] = useState('')
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setQuery(value)
  }

  // 文件上传相关-Begin
  const fileUploader = useRef<HTMLInputElement>(null)
  // const supportFileTypes = ['txt', 'markdown', 'md', 'pdf', 'html', 'htm', 'xlsx', 'doc', 'xls', 'docx', 'csv', 'eml', 'msg', 'pptx', 'ppt', 'xml', 'jpg', 'png', 'jpeg', 'epub']
  const supportFileTypes = ['txt', 'markdown', 'md', 'pdf', 'html', 'htm', 'xlsx', 'doc', 'xls', 'docx', 'csv', 'eml', 'msg', 'pptx', 'ppt', 'xml', 'epub']
  const ACCEPTS = supportFileTypes.map((ext: string) => `.${ext}`)
  const { locale } = useContext(I18n)
  const supportTypesShowNames = (() => {
    const extensionMap: { [key: string]: string } = {
      md: 'markdown',
      pptx: 'pptx',
      htm: 'html',
      xlsx: 'xlsx',
      docx: 'docx',
    }

    return [...supportFileTypes]
      .map(item => extensionMap[item] || item) // map to standardized extension
      .map(item => item.toLowerCase()) // convert to lower case
      .filter((item, index, self) => self.indexOf(item) === index) // remove duplicates
      .map(item => item.toUpperCase()) // convert to upper case
      .join(locale !== LanguagesSupported[1] ? ', ' : '、 ')
  })()
  const selectHandle = () => {
    if (fileUploader.current)
      fileUploader.current.click()
  }
  const [fileList, setFiles] = useState<FileItem[]>([])
  const fileListRef = useRef<FileItem[]>([])
  // const updateFileList = (preparedFiles: FileItem[]) => {
  const prepareFileList = (preparedFiles: FileItem[]) => {
    setFiles(preparedFiles)
  }
  // const updateFile = (fileItem: FileItem, progress: number, list: FileItem[]) => {
  const onFileUpdate = (fileItem: FileItem, progress: number, list: FileItem[]) => {
    const targetIndex = list.findIndex(file => file.fileID === fileItem.fileID)
    list[targetIndex] = {
      ...list[targetIndex],
      progress,
      progress_title: fileItem.progress_title,
    }
    setFiles([...list])
    // use follow code would cause dirty list update problem
    // const newList = list.map((file) => {
    //   if (file.fileID === fileItem.fileID) {
    //     return {
    //       ...fileItem,
    //       progress,
    //     }
    //   }
    //   return file
    // })
    // setFiles(newList)
  }
  // utils
  const getFileType = (currentFile: File) => {
    if (!currentFile)
      return ''

    const arr = currentFile.name.split('.')
    return arr[arr.length - 1]
  }

  const getFileSize = (size: number) => {
    if (size / 1024 < 10)
      return `${(size / 1024).toFixed(2)}KB`

    return `${(size / 1024 / 1024).toFixed(2)}MB`
  }

  const removeFile = (fileID: string) => {
    if (fileUploader.current)
      fileUploader.current.value = ''

    /* const index = fileListRef.current.findIndex(item => item.fileID === fileID)
    let fileListRefOfDel = fileListRef.current[index] */

    // 待删除的文档对象
    const fileListRefOfDel = fileListRef.current.find(item => item.fileID === fileID)

    fileListRef.current = fileListRef.current.filter(item => item.fileID !== fileID)
    // onFileListUpdate?.([...fileListRef.current])
    prepareFileList?.([...fileListRef.current])
    // TODO 同时根据知识库ID-tmpDatasetId和文档ID-document_id进行删除：DELETE /console/api/datasets/${tmpDatasetId}/documents/${document_id}
    // TODO 获取临时知识库ID-tmpDatasetId中的所有文档：GET /console/api/datasets/${tmpDatasetId}/documents?page=1&limit=15&keyword=&fetch=
    console.log(tmpDatasetId, fileListRefOfDel?.file?.document_id)
  }

  const { data: fileUploadConfigResponse } = useSWR({ url: '/files/upload' }, fetchFileUploadConfig)
  const fileUploadConfig = useMemo(() => fileUploadConfigResponse ?? {
    file_size_limit: 15,
    batch_count_limit: 5,
  }, [fileUploadConfigResponse])

  const fileUpload = useCallback(async (fileItem: FileItem): Promise<FileItem> => {
    const formData = new FormData()
    formData.append('file', fileItem.file)
    if (tmpDatasetId?.length > 0)
      formData.append('tmp_dataset_id', tmpDatasetId)
    formData.append('conversation_id', (currentConversationId || ((conversationId !== undefined && conversationId?.length > 0) ? conversationId : '')))

    const onProgress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        const percent = Math.floor(e.loaded / e.total * 100)
        if (percent === 100)
          fileItem.progress_title = '文件上传成功'
        onFileUpdate(fileItem, percent, fileListRef.current)
      }
    }

    /* const [indexingStatusBatchDetail, setIndexingStatusDetail] = useState<IndexingStatusResponse[]>([])
    const fetchIndexingStatus = async (progress_url: string) => {
      const status = await doFetchIndexingStatus({ url: progress_url })
      setIndexingStatusDetail(status.data)
      return status.data
    } */

    return upload_in_app({
      xhr: new XMLHttpRequest(),
      data: formData,
      onprogress: onProgress,
      // }, false, undefined, '?source=datasets')
    }, false, '/files/upload_in_app', undefined)
      .then((res: File) => {
        let progress_url = ''
        const fileRes = fileItem.file
        if (res?.tmp_dataset_id && res?.tmp_dataset_id?.length > 0)
          fileRes.tmp_dataset_id = res?.tmp_dataset_id
        if (res?.progress_url && res?.progress_url?.length > 0) {
          fileRes.progress_url = res?.progress_url
          progress_url = res?.progress_url
        }

        const completeFile = {
          fileID: fileItem.fileID,
          file: fileRes,
          progress: -1,
          progress_title: '正在提交解析中...',
        }
        if (res?.tmp_dataset_id && res?.tmp_dataset_id?.length > 0)
          setTmpDatasetId(res.tmp_dataset_id)
        const index = fileListRef.current.findIndex(item => item.fileID === fileItem.fileID)
        fileListRef.current[index] = completeFile
        onFileUpdate(completeFile, 100, fileListRef.current)

        const getSourcePercent = (detail: IndexingStatusResponse) => {
          const completedCount = detail.completed_segments || 0
          const totalCount = detail.total_segments || 0
          if (totalCount === 0)
            return 0
          const percent = Math.round(completedCount * 100 / totalCount)
          return percent > 100 ? 100 : percent
        }
        // 'waiting','parsing','cleaning','splitting','indexing','paused','error','completed',
        const parsingHandleStatusUpdate = (detail: IndexingStatusResponse) => {
          let progress_title_msg = '正在解析中...'
          if (detail.indexing_status === 'splitting')
            progress_title_msg = '解析-分段处理中...'
          else if (detail.indexing_status === 'indexing')
            progress_title_msg = '解析-索引处理中...'
          else if (detail.indexing_status === 'cleaning')
            progress_title_msg = '解析-清洗处理中...'
          else if (detail.indexing_status === 'paused')
            progress_title_msg = '解析暂停...'
          else if (detail.indexing_status === 'error')
            progress_title_msg = '解析出错...'
          else if (detail.indexing_status === 'completed')
            progress_title_msg = ''

          const document_id = detail?.id || ''
          if (document_id?.length > 0)
            fileRes.document_id = document_id
          let progress_val = -1
          progress_val = getSourcePercent(detail)
          const completeFile = {
            fileID: fileItem.fileID,
            file: fileRes,
            progress: progress_val,
            progress_title: progress_title_msg,
          }

          const index = fileListRef.current.findIndex(item => item.fileID === fileItem.fileID)
          fileListRef.current[index] = completeFile
          // onFileUpdate(completeFile, 100, fileListRef.current)
          onFileUpdate(completeFile, progress_val, fileListRef.current)
        }
        const timingFrequency = 90 // 1分钟 = 60s;且每2秒执行一次，那么定时执行次数为 = 60*3/2 = 90
        let currTimingFrequency = 0
        const regularCall = async (size: string) => {
          if (progress_url?.length > 0) {
            const progress_url_temp = progress_url.replace('/console/api/', '')
            const status = await doFetchIndexingStatus({ url: progress_url_temp })
            // console.log(status)
            currTimingFrequency++
            const indexingStatusBatchDetail = status?.data || []
            // 'indexing' - 索引中, 'splitting'-分段中, 'parsing'-解析中, 'cleaning'-清洗中
            if (indexingStatusBatchDetail !== null && indexingStatusBatchDetail !== undefined && indexingStatusBatchDetail.length > 0) {
              const isCompleted = indexingStatusBatchDetail.every(indexingStatusDetail => ['completed', 'error', 'paused'].includes(indexingStatusDetail.indexing_status))
              if (isCompleted) {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                clearInterval(intervalId)
              }
            }
            if (currTimingFrequency >= timingFrequency) { // 超时超出3分钟分段清洗还未处理完，则停止循环定时执行
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              clearInterval(intervalId)
            }
            if (indexingStatusBatchDetail !== null && indexingStatusBatchDetail !== undefined && indexingStatusBatchDetail.length > 0)
              parsingHandleStatusUpdate(indexingStatusBatchDetail[0])
          }
        }

        const intervalId = setInterval(regularCall, 2000) // 设置定时器，每2000毫秒（2秒）执行一次regularCall函数

        return Promise.resolve({ ...completeFile })
      })
      .catch((e) => {
        notify({ type: 'error', message: e?.response?.code === 'forbidden' ? e?.response?.message : t('datasetCreation.stepOne.uploader.failed') })
        fileItem.progress_title = '文件上传网络异常'
        onFileUpdate(fileItem, -2, fileListRef.current)
        return Promise.resolve({ ...fileItem })
      })
      .finally()
  }, [fileListRef, notify, onFileUpdate, t])

  const uploadBatchFiles = useCallback((bFiles: FileItem[]) => {
    bFiles.forEach(bf => (bf.progress = 0))
    return Promise.all(bFiles.map(fileUpload))
  }, [fileUpload])

  const uploadMultipleFiles = useCallback(async (files: FileItem[]) => {
    const batchCountLimit = fileUploadConfig.batch_count_limit
    const length = files.length
    let start = 0
    let end = 0

    while (start < length) {
      if (start + batchCountLimit > length)
        end = length
      else
        end = start + batchCountLimit
      const bFiles = files.slice(start, end)
      await uploadBatchFiles(bFiles)
      start = end
    }
  }, [fileUploadConfig, uploadBatchFiles])

  const initialUpload = useCallback((files: File[]) => {
    if (!files.length)
      return false

    if (files.length + fileList.length > FILES_NUMBER_LIMIT) {
      notify({ type: 'error', message: t('datasetCreation.stepOne.uploader.validation.filesNumber', { filesNumber: FILES_NUMBER_LIMIT }) })
      return false
    }

    const preparedFiles = files.map((file, index) => ({
      fileID: `file${index}-${Date.now()}`,
      file,
      progress: -1,
      progress_title: '文件上传中...',
    }))
    const newFiles = [...fileListRef.current, ...preparedFiles]
    // console.log('hideUpload:', hideUpload)
    prepareFileList(newFiles)
    fileListRef.current = newFiles
    uploadMultipleFiles(preparedFiles)
  }, [prepareFileList, uploadMultipleFiles, notify, t, fileList])

  const fileChangeHandle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])] as File[]
    console.log('fileChangeHandle', files)
    // initialUpload(files.filter(isValid))
    initialUpload(files)
  }, [initialUpload])
  // }, [isValid, initialUpload])

  const handleSend = () => {
    if (onSend) {
      if (files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
        notify({ type: 'info', message: t('appDebug.errorMessage.waitForImgUpload') })
        return
      }
      if (!query || !query.trim()) {
        notify({ type: 'info', message: t('appAnnotation.errorMessage.queryRequired') })
        return
      }
      onSend(query, tmpDatasetId, files.filter(file => file.progress !== -1).map(fileItem => ({
        type: 'image',
        transfer_method: fileItem.type,
        url: fileItem.url,
        upload_file_id: fileItem.fileId,
      })))
      setQuery('')
      // setTmpDatasetId('')
      onClear()
    }
  }
  // 文件上传相关-End

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current)
        handleSend()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      setQuery(query.replace(/\n$/, ''))
      e.preventDefault()
    }
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }
  const handleVoiceInputShow = () => {
    (Recorder as any).getPermission().then(() => {
      setVoiceInputShow(true)
    }, () => {
      logError(t('common.voiceInput.notAllow'))
    })
  }

  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const sendBtn = (
    <div
      className='group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#EBF5FF] cursor-pointer'
      onClick={handleSend}
    >
      <Send03
        className={`
          w-5 h-5 text-gray-300 group-hover:text-primary-600
          ${!!query.trim() && 'text-primary-600'}
        `}
      />
    </div>
  )

  return (
    <>
      <div className='relative'>
        <div
          className={`
            p-[5.5px] max-h-[150px] bg-white border-[1.5px] border-gray-200 rounded-xl overflow-y-auto
            ${isDragActive && 'border-primary-600'} mb-2
          `}
        >
          {
            visionConfig?.enabled && (
              <>
                <div className='absolute bottom-2 left-2 flex items-center'>
                  <ChatImageUploader
                    settings={visionConfig}
                    onUpload={onUpload}
                    disabled={files.length >= visionConfig.number_limits}
                  />
                  <div className='mx-1 w-[1px] h-4 bg-black/5' />
                </div>
                <div className='pl-[52px]'>
                  <ImageList
                    list={files}
                    onRemove={onRemove}
                    onReUpload={onReUpload}
                    onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                    onImageLinkLoadError={onImageLinkLoadError}
                  />
                </div>
              </>
            )
          }
          <Textarea
            className={`
              block w-full px-2 pr-[118px] py-[7px] leading-5 max-h-none text-sm text-gray-700 outline-none appearance-none resize-none
              ${visionConfig?.enabled && 'pl-12'}
            `}
            value={query}
            onChange={handleContentChange}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            autoSize
          />
          <div className='absolute bottom-[7px] right-2 flex items-center h-8'>
            <div className='flex items-center px-1 h-5 rounded-md bg-gray-100 text-xs font-medium text-gray-500'>
              {query.trim().length}
            </div>
            {
              query
                ? (
                  <div className='flex justify-center items-center ml-2 w-8 h-8 cursor-pointer hover:bg-gray-100 rounded-lg' onClick={() => setQuery('')}>
                    <XCircle className='w-4 h-4 text-[#98A2B3]' />
                  </div>
                )
                : speechToTextConfig?.enabled
                  ? (
                    <div
                      className='group flex justify-center items-center ml-2 w-8 h-8 hover:bg-primary-50 rounded-lg cursor-pointer'
                      onClick={handleVoiceInputShow}
                    >
                      <Microphone01 className='block w-4 h-4 text-gray-500 group-hover:hidden' />
                      <Microphone01Solid className='hidden w-4 h-4 text-primary-600 group-hover:block' />
                    </div>
                  )
                  : null
            }
            {
              <div className='group flex justify-center items-center ml-2 w-8 h-8 cursor-pointer rounded-lg hover:bg-[#EBF5FF] cursor-pointer' onClick={selectHandle}>
                <Tooltip
                  htmlContent={
                    <div className='w-[180px]'>
                      {t('datasetCreation.stepOne.uploader.tip', {
                        size: '100',
                        supportTypes: supportTypesShowNames,
                      })}
                    </div>
                  }
                  selector='workflow-tool-modal-tooltip'
                >
                  <FileUpload className='w-5 h-5 text-gray-300 group-hover:text-primary-600' />
                </Tooltip>
                {(<input
                  ref={fileUploader}
                  id="fileUploader"
                  style={{ display: 'none' }}
                  type="file"
                  multiple
                  accept={ACCEPTS.join(',')}
                  onChange={fileChangeHandle}
                />)}
              </div>
            }
            <div className='mx-2 w-[1px] h-4 bg-black opacity-5' />
            {isMobile
              ? sendBtn
              : (
                <TooltipPlus
                  popupContent={
                    <div style={{
                      /* backgroundColor: 'rgba(3,3,3,0.2)', */
                    }}>
                      <div>{t('common.operation.send')} Enter</div>
                      <div>{t('common.operation.lineBreak')} Shift Enter</div>
                    </div>
                  }
                >
                  {sendBtn}
                </TooltipPlus>
              )}
          </div>
          {
            voiceInputShow && (
              <VoiceInput
                onCancel={() => setVoiceInputShow(false)}
                onConverted={text => setQuery(text)}
              />
            )
          }
        </div>
      </div>
      {appData?.site?.custom_disclaimer && <div className='text-xs text-gray-500 mt-1 text-center'>
        {appData.site.custom_disclaimer}
      </div>}
      <>
        <div className={s.fileList} style={{ width: '100%' }}>
          {fileList.map((fileItem, index) => (
            <div
              key={`${fileItem.fileID}-${index}`}
              className={cn(
                s.file,
                fileItem.progress < 100 && s.uploading,
              )}
              style={{ maxWidth: '100%' }}
            >
              {fileItem.progress < 100 && (
                <div className={s.progressbar} style={{ width: `${fileItem.progress}%` }} />
              )}
              <div className={s.fileInfo}>
                <div className={cn(s.fileIcon, s[getFileType(fileItem.file)])} />
                <div className={s.filename}>{fileItem.file.name}</div>
                <div className={s.size}>{getFileSize(fileItem.file.size)}</div>
              </div>
              <div className={s.actionWrapper}>
                {(<div className={cn(
                  s.percent_title,
                  fileItem.progress < 0 && s.percent_title_error,
                )}>{`${fileItem.progress_title || ''}`}</div>)}
                {(fileItem.progress < 100 && fileItem.progress >= 0) && (
                  <div className={s.percent}>{`${fileItem.progress}%`}</div>
                )}
                {fileItem.progress === 100 && (
                  <div className={s.remove} onClick={(e) => {
                    e.stopPropagation()
                    removeFile(fileItem.fileID)
                  }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    </>
  )
}

export default memo(ChatInput)
