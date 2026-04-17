/**
 * Hook reutilizable para canales Realtime de Supabase
 */
import { supabase } from '../../../../utils/supabase'

export interface RealtimeListener {
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  callback: (payload: any) => void
}

export function useRealtimeChannel(
  channelName: string,
  listeners: RealtimeListener[]
) {
  const channel = supabase.channel(channelName)

  listeners.forEach((listener) => {
    channel.on(
      'postgres_changes',
      {
        event: listener.event,
        schema: listener.schema,
        table: listener.table,
      },
      listener.callback
    )
  })

  const subscribe = () => {
    return channel.subscribe((status) => {
      console.log(`[Realtime ${channelName}] Status:`, status)
    })
  }

  const unsubscribe = () => {
    supabase.removeChannel(channel)
  }

  return { subscribe, unsubscribe, channel }
}
