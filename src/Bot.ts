import Database, { Game, Player } from "./Database";
import RiotAPI, { RiotMatch, RiotParticipantIdentity } from "./RiotAPI";
import crypto from "crypto"
import TwitterAPI from "./TwitterAPI";
import { kill } from "node:process";
import TrackingThePros, { BootcampDataEntry } from "./TrackingThePros";

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
  trackingThePros: TrackingThePros
  bootcampDataCache: BootcampDataEntry[]

  constructor () {
    this.database = new Database()
    this.riotApi = new RiotAPI(process.env.RIOT_API_TOKEN!)
    this.players = []
    this.twitterApi = new TwitterAPI()
    this.trackingThePros = new TrackingThePros()
    this.bootcampDataCache = []
  }

  async init () {
    await this.updatePlayerCache()
    await this.validateTokenHash()

    const changed = await this.updateSummonerIds()
    if (changed) await this.updatePlayerCache()

    this.runTasks()
    setInterval(() => {
      this.runTasks()
    }, 2 * 60 * 1000)
  }

  async runTasks () {
    console.log('Running tasks')

    // Add replies to game tweets when they end
    await this.tweetFinishedGames()

    // Checking each player's game
    await this.tweetCurrentGames()

    // Update bootcamp data
    await this.updateBootcampDataCache()

    // Tweeting about TrackingThePros ranking changes
    await this.tweetRankingChanges()
  }

  async updateBootcampDataCache () {
    this.bootcampDataCache = await this.trackingThePros.getBootcampData()
  }

  async tweetRankingChanges () {
    if (!!process.env.DISABLE_RANKING_TWEETS) return
    console.log(`\nChecking for changes in player's TTP rankings`)

    for (const p of this.players) {
      const lastRank = await this.database.getLastTTPRank(p.id)

      const currentEntry = this.bootcampDataCache.find(d => d.plug === p.name)!
      const newRank = currentEntry.rankNum

      if (newRank != lastRank) {
        const playerAbove = this.bootcampDataCache.find(b => b.rankNum == newRank - 1)
        const playerBelow = this.bootcampDataCache.find(b => b.rankNum == newRank + 1)

        let text = ''
        if (newRank < lastRank) {
          console.log(`${p.name} has gone down in the ranking. Tweeting about it.`)
          text = [
            `🔼 ${p.name} subiu para a ${newRank}ᵃ no ranking do Tracking The Pros!`,
            '',
            `O jogador passou ${playerBelow!.plug} e agora luta pela ${playerAbove!.rankNum}ᵃ posição com ${playerAbove!.plug}.`
          ].join('\n')
        } else {
          console.log(`${p.name} has gone down in the ranking. Tweeting about it.`)
          text = [
            `🔻 ${p.name} caiu para a ${newRank}ᵃ no ranking do Tracking The Pros.`,
            '',
            `O jogador foi passado por ${playerAbove!.plug} e agora luta com ${playerBelow!.plug} para manter sua posição.`
          ].join('\n')
        }

        await this.twitterApi.tweet(text)

        console.log(`Updating TTP ranking for ${p.name} on the database`)
        await this.database.setLastTTPRank(p.id, newRank)
      } else {
        console.log(`${p.name} has not moved in the ranking. Skipping.`)
      }
    }
  }

  async tweetCurrentGames () {
    console.log(`\nLooking for games happening right now`)

    const games: Array<RiotGame> = []
    for (let p of this.players) {
      let response = await this.riotApi.getCurrentGame(p.summonerId)

      if (response) console.log(`Found game for ${p.name}, ID ${response.gameId}`)

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

  async tweetFinishedGames () {
    console.log('\nLooking for recently finished games')

    const unfinished = await this.database.getUnfinishedGames()

    console.log(`Found ${unfinished.length} game(s) not marked as finished on the database. Checking their status with Riot.`)

    for (let game of unfinished) {
      const gameData = await this.riotApi.getMatch(game.id)
      
      if (gameData) {
        console.log(`Game ${game.id} has finished. Tweeting about it.`)
      } else {
        console.log(`Game ${game.id} hasn't finished yet. Skipping.`)
        continue
      }

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
  }

  async updatePlayerCache () {
    this.players = await this.database.getAllPlayers()
  }

  async validateTokenHash () {
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
  }

  async updateSummonerIds () {
    let changed = false

    for (let p of this.players) {
      if (!p.summonerId) {
        changed = true
        console.log(`Fetching summoner ID for ${p.name} (${p.summonerName})`)
        let response = await this.riotApi.getSummonerByName(p.summonerName)
        await this.database.setPlayerSummonerId(p.id, response.id)
      }
    }

    return changed
  }
}