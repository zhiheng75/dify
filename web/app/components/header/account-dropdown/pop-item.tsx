'use client'
import { useTranslation } from 'react-i18next'
import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useContext } from 'use-context-selector'
import classNames from 'classnames'
import Link from 'next/link'
// import { Menu, Transition } from '@headlessui/react'
import Indicator from '../indicator'
import AccountAbout from '../account-about'
import WorkplaceSelector from './workplace-selector'
import I18n from '@/context/i18n'
import Avatar from '@/app/components/base/avatar'
import { logout } from '@/service/common'
import { useAppContext } from '@/context/app-context'
import { ArrowUpRight } from '@/app/components/base/icons/src/vender/line/arrows'
import { LogOut01 } from '@/app/components/base/icons/src/vender/line/general'
import { useModalContext } from '@/context/modal-context'
import { LanguagesSupported } from '@/i18n/language'
export type IAppSelecotr = {
  isMobile: boolean
}

export default function AppSelector({ isMobile }: IAppSelecotr) {
  const itemClassName = `
    flex items-center w-full h-9 px-3 text-gray-700 text-[14px]
    rounded-lg font-normal hover:bg-gray-50 cursor-pointer
  `
  const router = useRouter()
  const [aboutVisible, setAboutVisible] = useState(false)

  const { locale } = useContext(I18n)
  const { t } = useTranslation()
  const { userProfile, langeniusVersionInfo } = useAppContext()
  const { setShowAccountSettingModal } = useModalContext()

  const handleLogout = async () => {
    await logout({
      url: '/logout',
      params: {},
    })

    if (localStorage?.getItem('console_token'))
      localStorage.removeItem('console_token')

    router.push('/signin')
  }

  return (
    <div className="">
      <div className="relative inline-block text-left">
        {
          <>
            <div
              className="
                    left-0 mt-1.5 w-60 w-[288px]
                    divide-y divide-gray-100 origin-bottom-right rounded-lg bg-white
                    shadow-lg
                  "
              style={{ margin: '-0.5rem -0.75rem' }}
            >
              <div>
                <div className='flex flex-nowrap items-center px-4 py-[13px]'>
                  <Avatar name={userProfile.name} size={36} className='mr-3' />
                  <div className='grow'>
                    <div className='leading-5 font-normal text-[14px] text-gray-800 break-all'>{userProfile.name}</div>
                    <div className='leading-[18px] text-xs font-normal text-gray-500 break-all'>{userProfile.email}</div>
                  </div>
                </div>
              </div>
              {/* <div className='px-1 py-1'>
                <div className='mt-2 px-3 text-xs font-medium text-gray-500'>{t('common.userProfile.workspace')}</div>
                <WorkplaceSelector />
              </div> */}
              <div className="px-1 py-1">
                <div>
                  <div className={itemClassName} onClick={() => setShowAccountSettingModal({ payload: 'account' })}>
                    <div>{t('common.userProfile.settings')}</div>
                  </div>
                </div>
                <div>
                  <Link
                    className={classNames(itemClassName, 'group justify-between')}
                    href={
                      locale !== LanguagesSupported[1] ? '/' : `/v/${locale.toLowerCase()}/`
                    }
                    target='_blank' rel='noopener noreferrer'>
                    <div>{t('common.userProfile.helpCenter')}</div>
                    <ArrowUpRight className='hidden w-[14px] h-[14px] text-gray-500 group-hover:flex' />
                  </Link>
                </div>
                {
                  document?.body?.getAttribute('data-public-site-about') !== 'hide' && (
                    <div>
                      <div className={classNames(itemClassName, 'justify-between')} onClick={() => setAboutVisible(true)}>
                        <div>{t('common.userProfile.about')}</div>
                        <div className='flex items-center'>
                          <div className='mr-2 text-xs font-normal text-gray-500'>{langeniusVersionInfo.current_version}</div>
                          <Indicator color={langeniusVersionInfo.current_version === langeniusVersionInfo.latest_version ? 'green' : 'orange'} />
                        </div>
                      </div>
                    </div>
                  )
                }
              </div>
              <div>
                <div className='p-1' onClick={() => handleLogout()}>
                  <div
                    className='flex items-center justify-between h-9 px-3 rounded-lg cursor-pointer group hover:bg-gray-50'
                  >
                    <div className='font-normal text-[14px] text-gray-700'>{t('common.userProfile.logout')}</div>
                    <LogOut01 className='hidden w-[14px] h-[14px] text-gray-500 group-hover:flex' />
                  </div>
                </div>
              </div>
            </div>
          </>
        }
      </div>
      {
        aboutVisible && <AccountAbout onCancel={() => setAboutVisible(false)} langeniusVersionInfo={langeniusVersionInfo} />
      }
    </div >
  )
}
