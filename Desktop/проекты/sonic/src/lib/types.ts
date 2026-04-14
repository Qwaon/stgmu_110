export type UserRole = 'owner' | 'admin'
export type RoomStatus = 'free' | 'busy' | 'booked'
export type RoomType = 'standard' | 'vip'
export type SessionStatus = 'active' | 'paused' | 'completed'
export type BookingStatus = 'active' | 'completed' | 'cancelled'

export interface Club {
  id: string
  name: string
  address: string | null
  hourly_rate: number
  created_at: string
}

export interface Room {
  id: string
  club_id: string
  name: string
  type: RoomType
  status: RoomStatus
  hourly_rate: number | null
  created_at: string
}

export interface Session {
  id: string
  room_id: string
  club_id: string
  client_name: string
  started_at: string
  ended_at: string | null
  paused_at: string | null
  paused_duration_ms: number
  total_minutes: number | null
  total_amount: number | null
  status: SessionStatus
  created_at: string
}

export interface Order {
  id: string
  session_id: string
  club_id: string
  item_name: string
  price: number
  quantity: number
  created_at: string
}

export interface Booking {
  id: string
  club_id: string
  room_id: string
  client_name: string
  phone: string | null
  starts_at: string
  ends_at: string
  notes: string | null
  status: BookingStatus
  created_at: string
}

export interface AppUser {
  id: string
  email: string
  role: UserRole
  club_id: string | null
  created_at: string
}

export interface MenuItem {
  id: string
  club_id: string
  name: string
  price: number
  is_pinned: boolean
  order_count: number
  created_at: string
}

// Session with its orders attached
export interface ActiveSession extends Session {
  orders: Order[]
}

// Room with its current active/paused session (null if free)
export interface RoomWithSession extends Room {
  active_session: ActiveSession | null
}
