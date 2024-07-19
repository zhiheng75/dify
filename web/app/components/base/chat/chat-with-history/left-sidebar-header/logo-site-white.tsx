import type { FC } from 'react'
import classNames from 'classnames'
import { LEFT_SIDEBAR_HEADER_NAV_SMALL_LOGO } from '@/config'

type LogoSiteProps = {
  className?: string
}

const LogoSiteWhite: FC<LogoSiteProps> = ({
  className,
}) => {
  return (
    <img
      src={ LEFT_SIDEBAR_HEADER_NAV_SMALL_LOGO }
      className={classNames('block w-[45px] h-[60px]', className)}
      alt='logo'
    />
  )
}

export default LogoSiteWhite
