import Database, { Player } from "./Database";
import RiotAPI from "./RiotAPI";

export default class Bot {
  database: Database
  riotApi: RiotAPI
  players: Array<Player>

  constructor () {
    this.database = new Database()
    this.riotApi = new RiotAPI(process.env.RIOT_API_TOKEN!)
    this.players = []
  }

  async init () {
    this.players = await this.database.getAllPlayers()

    for (let p of this.players) {
      if (!p.summonerId) {
        console.log(`Fetching summoner ID for ${p.name} (${p.summonerName})`)
        let response = await this.riotApi.getSummonerByName(p.summonerName)
        await this.database.setPlayerSummonerId(p.id, response.id)
      }
    }
  }
}