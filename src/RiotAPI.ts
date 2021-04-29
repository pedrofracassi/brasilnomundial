import axios, { AxiosInstance } from "axios"

export default class RiotAPI {
  riotKey: string
  axios: AxiosInstance

  constructor (riotKey: string) {
    this.riotKey = riotKey

    this.axios = axios.create({
      baseURL: `https://euw1.api.riotgames.com`,
      headers: {
        'X-Riot-Token': this.riotKey
      }
    })
  }

  getSummonerByName (name: string) {
    return this.axios.get(`/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`).then(res => res.data)
  }

  getLeagueEntries (encryptedSummonerId: string) {
    return this.axios.get(`/lol/league/v4/entries/by-summoner/${encodeURIComponent(encryptedSummonerId)}`).then(res => res.data)
  }
}