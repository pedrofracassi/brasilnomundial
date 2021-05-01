import axios, { AxiosInstance } from "axios"

export interface RiotParticipantIdentity {
  participantId: number
  player: RiotPlayer
}

export interface RiotPlayer {
  profileIcon: number
  accountId: string
  matchHistoryUri: string
  currentAccountId: string
  currentPlatformId: string
  summonerName: string
  summonerId: string
  platformId: string
}

export interface RiotMatchParticipant {
  participantId: number
  championId: number
  runes: Object[] // TODO
  stats: RiotMatchParticipantStats // TODO
  teamId: number
  timeline: Object // TODO
  spell1Id: number
  highestAchievedSeasonTier: string
  masteries: Object // TODO
}

export interface RiotMatch {
  gameId: number
  participantIdentities: RiotParticipantIdentity[]
  queueId: number
  gameType: string
  gameDuration: number
  teams: Object[] // TODO Documentar teams
  platformId: string
  gameCreation: number
  seasonId: number
  gameVersion: string
  mapId: number
  gameMode: string
  participants: RiotMatchParticipant[]
}

export interface RiotMatchParticipantStats {
  item0: number
  item2: number
  totalUnitsHealed: number
  item1: number
  largestMultiKill: number
  goldEarned: number
  firstInhibitorKill: boolean
  physicalDamageTaken: number
  nodeNeutralizeAssist: number
  totalPlayerScore: number	
  champLevel: number	
  damageDealtToObjectives: number	
  totalDamageTaken: number	
  neutralMinionsKilled: number	
  deaths: number	
  tripleKills: number	
  magicDamageDealtToChampions: number	
  wardsKilled: number	
  pentaKills: number	
  damageSelfMitigated: number	
  largestCriticalStrike: number	
  nodeNeutralize: number	
  totalTimeCrowdControlDealt: number	
  firstTowerKill: boolean	
  magicDamageDealt: number	
  totalScoreRank: number	
  nodeCapture: number	
  wardsPlaced: number	
  totalDamageDealt: number	
  timeCCingOthers: number	
  magicalDamageTaken: number	
  largestKillingSpree: number	
  totalDamageDealtToChampions: number	
  physicalDamageDealtToChampions: number	
  neutralMinionsKilledTeamJungle: number	
  totalMinionsKilled: number	
  firstInhibitorAssist: boolean	
  visionWardsBoughtInGame: number	
  objectivePlayerScore: number	
  kills: number	
  firstTowerAssist: boolean	
  combatPlayerScore: number	
  inhibitorKills: number	
  turretKills: number	
  participantId: number	
  trueDamageTaken: number	
  firstBloodAssist: boolean	
  nodeCaptureAssist: number	
  assists: number	
  teamObjective: number	
  altarsNeutralized: number	
  goldSpent: number	
  damageDealtToTurrets: number	
  altarsCaptured: number	
  win: boolean	
  totalHeal: number	
  unrealKills: number	
  visionScore: number	
  physicalDamageDealt: number	
  firstBloodKill: boolean	
  longestTimeSpentLiving: number	
  killingSprees: number	
  sightWardsBoughtInGame: number	
  trueDamageDealtToChampions: number	
  neutralMinionsKilledEnemyJungle: number	
  doubleKills: number	
  trueDamageDealt: number	
  quadraKills: number
}

export default class RiotAPI {
  riotKey: string
  axios: AxiosInstance
  region: string

  constructor (riotKey: string) {
    this.riotKey = riotKey
    this.region = 'euw1'

    this.axios = axios.create({
      baseURL: `https://${this.region}.api.riotgames.com`,
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

  async getCurrentGame (encryptedSummonerId: string) {
    try {
      const response = await this.axios.get(`/lol/spectator/v4/active-games/by-summoner/${encodeURIComponent(encryptedSummonerId)}`).then(res => res.data)
      return response
    } catch (e) {
      return null
    }
  }

  getMatch (matchId: number) {
    return this.axios.get(`/lol/match/v4/matches/${matchId}`).then(res => res.data)
  }
}