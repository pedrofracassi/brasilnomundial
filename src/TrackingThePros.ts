import axios, { AxiosInstance } from "axios"

export interface BootcampDataEntry {
  DT_RowId: string
  player: string
  summoner: string
  role: string
  roleNum: number
  team: string
  winper: string
  winperNum: string
  wins: string
  losses: string
  lossesNum: string
  winsNum: string
  team_plug: string
  plug: string
  rank: string
  rankNum: number
  rankHigh: string
  rankHighNum: string
  rankHighLP: string
  rankHighLPNum: string
  online: string
  onStream: boolean
  onlineNum: number | null
  gameID: 0
}

export default class TrackingThePros {
  axios: AxiosInstance

  constructor () {
    this.axios = axios.create({
      baseURL: `https://www.trackingthepros.com/`
    })
  }

  getBootcampData (): Promise<BootcampDataEntry[]> {
    return this.axios.get('/d/list_bootcamp', { params: { existing: 'no' } }).then(res => res.data.data)
  }
}