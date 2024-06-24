import type { FC } from 'react'
import classNames from 'classnames'

type LogoSiteProps = {
  className?: string
}

const LogoSiteWhite: FC<LogoSiteProps> = ({
  className,
}) => {
  return (
    <img
      src='/logo/logo-site-white.png'
      className={classNames('block w-[45px] h-[60px]', className)}
      alt='logo'
    />
  )
}

export default LogoSiteWhite
