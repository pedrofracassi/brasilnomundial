import Database, { Game, Player } from "./Database";
import RiotAPI, { RiotMatch, RiotParticipantIdentity } from "./RiotAPI";
import crypto from "crypto"
import TwitterAPI from "./TwitterAPI";
import { kill } from "node:process";

interface GameParticipant {
  teamId: number
  spell1Id: number
  spell2Id: number
  championId: number
  profileIconId: number
  summonerName: string
  bot: boolean
  summonerId: string
  gameCustomizationObjects: Object[]
  perks: Object
}

interface RiotGame {
  gameId: number,
  participants: GameParticipant[]
}

interface Tweet {
  id_str: string
}

function formatArray (arr: string[]){
  var outStr = "";
  if (arr.length === 1) {
      outStr = arr[0];
  } else if (arr.length === 2) {
      outStr = arr.join(' e ');
  } else if (arr.length > 2) {
      outStr = arr.slice(0, -1).join(', ') + ' e ' + arr.slice(-1);
  }
  return outStr;
}

export default class Bot {
  database: Database
  riotApi: RiotAPI
  players: Array<Player>
  twitterApi: TwitterAPI

  constructor () {
    this.database = new Database()
    this.riotApi = new RiotAPI(process.env.RIOT_API_TOKEN!)
    this.players = []
    this.twitterApi = new TwitterAPI()
  }

  async init () {
    await this.updatePlayerCache()

    // # TODO: Clear summoner IDs if the id has changed
    const currentTokenHash = crypto.createHash('md5').update(process.env.RIOT_API_TOKEN!).digest('hex')
    const lastTokenHash = await this.database.getSetting('riot_api_token_hash')

    if (lastTokenHash != currentTokenHash) {
      console.log('Riot API token has changed. Deleting all summoner IDs')
      await this.database.playerModel.update({
        summonerId: null
      }, {
        where: {}
      })
      await this.database.updateSetting('riot_api_token_hash', currentTokenHash)
    }

    let changed = false

    for (let p of this.players) {
      if (!p.summonerId) {
        changed = true
        console.log(`Fetching summoner ID for ${p.name} (${p.summonerName})`)
        let response = await this.riotApi.getSummonerByName(p.summonerName)
        await this.database.setPlayerSummonerId(p.id, response.id)
      }
    }

    if (changed) await this.updatePlayerCache()

    this.checkPlayerGames()
    setInterval(() => {
      this.checkPlayerGames()
    }, 2 * 60 * 1000)
  }

  async updatePlayerCache () {
    this.players = await this.database.getAllPlayers()
  }

  async checkPlayerGames () {
    console.log('Checking games...')

    // Checking games that haven't finished yet
    const unfinished = await this.database.getUnfinishedGames()

    for (let game of unfinished) {
      const gameData: RiotMatch = await this.riotApi.getMatch(game.id)
      if (!gameData) continue

      // console.log(gameData)

      const filteredIdentities = gameData.participantIdentities.filter((p: RiotParticipantIdentity) => this.players.some(pl => pl.summonerId == p.player.summonerId))
      const filteredPlayers = gameData.participants.filter(p => filteredIdentities.some(id => id.participantId === p.participantId))

      filteredPlayers.forEach(p => p.stats.win)

      const endgameText = [
        filteredPlayers[0].stats.win ? '✅ VITÓRIA' : '❌ DERROTA',
        '',
        ...filteredPlayers.map(p => {
          const summonerId = filteredIdentities.find(id => id.participantId === p.participantId)!.player.summonerId
          const player = this.players.find(pl => pl.summonerId === summonerId)
          const kills = p.stats.kills
          const deaths = p.stats.deaths
          const assists = p.stats.assists
          return `${player!.name} (${player!.summonerName}) - ${kills}/${deaths}/${assists}`
        }),
        '',
        `Análise da partida: https://www.leagueofgraphs.com/pt/match/euw/${game.id}`
      ].join('\n')

      await this.database.setGameFinished(game.id)
      await this.twitterApi.tweet(endgameText, game.tweetId)
    }

    // Checking each player's game
    const games: Array<RiotGame> = []
    for (let p of this.players) {
      let response = await this.riotApi.getCurrentGame(p.summonerId)
      if (response && !games.some(g => g.gameId == response.gameId)) {
        games.push(response)
      }
    }

    // Iterating through the unique games
    for (let game of games) {
      const hasBeenTweeted = await this.database.hasGameBeenTweeted(game.gameId)
      if (hasBeenTweeted) {
        console.log(`Game ${game.gameId} has already been tweeted about. Skipping.`)
        continue
      }

      const filteredParticipants = game.participants.filter(participant => this.players.some(player => player.summonerId === participant.summonerId))
      const mappedParticipants = filteredParticipants.map(p => this.players.find(pl => pl.summonerId == p.summonerId))
      
      console.log(`Tweeting about game ${game.gameId} with ${mappedParticipants.map(p => p?.name)}`)

      const group = filteredParticipants.length > 1

      const text = `${formatArray(mappedParticipants.map(p => p!.name))} ${group ? 'estão' : 'está'} em partida ${group ? 'juntos' : 'sozinho'}!\n\nVeja o matchup: https://lolpros.gg/live/${encodeURIComponent(mappedParticipants[0]!.lolprosId)}#${game.gameId}`

      const sentTweet = await this.twitterApi.tweet(text)
      const sentTweetId = (sentTweet.data as Tweet).id_str

      await this.database.addGame(game.gameId, sentTweetId)
    }
  }
}