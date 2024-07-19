import type { FC } from 'react'
import classNames from 'classnames'
import { TOP_HEADER_NAV_BIG_LOGO } from '@/config'

type LogoSiteProps = {
  className?: string
}

const LogoSite: FC<LogoSiteProps> = ({
  className,
}) => {
  return (
    <img
      src={ TOP_HEADER_NAV_BIG_LOGO }
      className={classNames('block w-auto h-10', className)}
      alt='logo'
    />
  )
}

export default LogoSite
