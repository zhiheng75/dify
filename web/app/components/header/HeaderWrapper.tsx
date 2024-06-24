'use client'
import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import { usePathname } from 'next/navigation'
import s from './index.module.css'
import { useAppContext } from '@/context/app-context'

// import { fetchMembers } from '@/service/common'
import { isInstalledAppUserChat } from '@/app/components/explore/chat-user-check'

type HeaderWrapperProps = {
  children: React.ReactNode
}

const HeaderWrapper = ({
  children,
}: HeaderWrapperProps) => {
  const pathname = usePathname()
  const isBordered = ['/apps', '/datasets', '/datasets/create', '/tools'].includes(pathname)

  const { userProfile } = useAppContext()
  const [hasInstalledAppUserChat, setHasInstalledAppUserChat] = useState(false)

  useEffect(() => {
    console.log('components >>>>>> header >>>>>> HeaderWrapper :', userProfile);

    (async () => {
      // 工作区 应用 用户处理
      setHasInstalledAppUserChat(isInstalledAppUserChat(userProfile?.email))
    })()
  }, [])
  // console.log('HeaderWrapper', userProfile)

  return (
    <>
      {!hasInstalledAppUserChat && (
        <div className={classNames(
          'sticky top-0 left-0 right-0 z-20 flex flex-col bg-gray-100 grow-0 shrink-0 basis-auto min-h-[56px]',
          s.header,
          isBordered ? 'border-b border-gray-200' : '',
        )}
        >
          {children}
        </div>)}
    </>
  )
}
export default HeaderWrapper
