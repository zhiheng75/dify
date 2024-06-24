import { installedChatUserList } from '@/app/components/explore/types'
import { installedChatUserAppIdList } from '@/app/components/explore/types'

/*
*判断是否是installed-app-user-chat
*/
export const isInstalledAppUserChat = (email: string) => {
  if (!email)
    return false
  const isInstalledAppUserChatFlag = installedChatUserList.includes(email)
  return isInstalledAppUserChatFlag
}

/*
*根据email获取installed-app的ID
*/
export const getInstalledAppId = (email: string) => {
  let installedAppId = ''
  if (!email)
    return installedAppId
  const targetIndex = installedChatUserList.findIndex(emailArrItem => emailArrItem === email)
  if (targetIndex > -1) {
    // console.log(targetIndex)
    installedAppId = installedChatUserAppIdList[targetIndex]
  }

  return installedAppId
}
