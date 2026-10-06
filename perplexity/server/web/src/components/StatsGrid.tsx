import { useMemo } from 'react'
import { BrutalistCard } from './ui/BrutalistCard'
import { PoolStatus, HeartbeatConfig } from 'lib/api'
import { useI18n } from 'lib/i18n'

interface StatsGridProps {
  data: PoolStatus
  hbConfig: HeartbeatConfig | null
}

export function StatsGrid({ data, hbConfig }: StatsGridProps) {
  const { t } = useI18n()
  const proCount = useMemo(
    () => (data.clients || []).filter((c) => c.state === 'normal').length,
    [data.clients]
  )

  const downgradeCount = useMemo(
    () => (data.clients || []).filter((c) => c.state === 'downgrade').length,
    [data.clients]
  )

  const getAutoRenewStatus = () => {
    if (!hbConfig) return { label: t('UNKNOWN'), color: 'text-gray-500' }
    if (!hbConfig.enable) return { label: t('DISABLED'), color: 'text-gray-500' }
    return { label: t('ACTIVE'), color: 'text-green-500' }
  }

  const hbStatus = getAutoRenewStatus()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      <BrutalistCard
        number="01"
        label={t('Total Clients')}
        value={data.total || 0}
        colorClass="text-acid"
      />
      <BrutalistCard
        number="02"
        label={t('Pro')}
        value={proCount}
        colorClass="text-green-400"
      />
      <BrutalistCard
        number="03"
        label={t('Downgrade')}
        value={downgradeCount}
        colorClass="text-yellow-400"
      />
      <BrutalistCard
        number="04"
        label={t('Auto Renew Cookie')}
        value={hbStatus.label}
        colorClass={hbStatus.color}
      />
    </div>
  )
}
