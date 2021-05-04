import { DataTypes, Model, ModelCtor, Sequelize } from "sequelize";

export interface Player {
  id: number,
  name: string,
  summonerName: string,
  summonerId: string,
  createdAt: Date,
  updatedAt: Date
  lolprosId: string
  lastTrackingTheProsRanking: number
}

export interface Game {
  id: number,
  ended: boolean,
  tweetId: string
}

export default class Database {
  sequelize: Sequelize
  playerModel: ModelCtor<Model>
  gameModel: ModelCtor<Model>
  settings: ModelCtor<Model>

  constructor () {
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: 'db.sqlite',
      logging: false
    })

    this.playerModel = this.sequelize.define('Player', {
      name: DataTypes.STRING,
      summonerName: DataTypes.STRING,
      summonerId: DataTypes.STRING,
      lolprosId: DataTypes.STRING,
      lastTrackingTheProsRanking: DataTypes.INTEGER
    }, { underscored: true } )
    
    this.settings = this.sequelize.define('Settings', {
      key: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      value: {
        type: DataTypes.STRING
      }
    }, { underscored: true })

    this.gameModel = this.sequelize.define('Game', {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true
      },
      ended: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      tweetId: DataTypes.STRING
    }, { underscored: true })

    this.sequelize.sync()
  }

  getLastTTPRank (playerId: number) {
    return this.playerModel.findOne({
      where: {
        id: playerId
      }
    }).then(res => res!.getDataValue('lastTrackingTheProsRanking'))
  }

  setLastTTPRank (playerId: number, rank: number) {
    return this.playerModel.update({
      lastTrackingTheProsRanking: rank
    }, {
      where: {
        id: playerId
      }
    })
  }

  addGame (gameId: number, tweetId: string) {
    return this.gameModel.create({
      id: gameId,
      tweetId: tweetId
    })
  }

  async hasGameBeenTweeted (gameId: number) {
    const result = await this.gameModel.findOne({
      where: {
        id: gameId
      }
    })
    return !!result
  }

  setGameFinished (gameId: number) {
    return this.gameModel.update({
      ended: true
    }, {
      where: {
        id: gameId
      }
    })
  }

  async getUnfinishedGames () {
    return await this.gameModel.findAll({
      where: {
        ended: false
      }
    }).then(games => games.map(g => g.toJSON() as Game))
  }

  async getGameTweetId (gameId: number) {
    return await this.gameModel.findOne({
      where: {
        id: gameId
      }
    }).then(g => g!.getDataValue('tweetId'))
  }

  updateSetting (key: string, value: string): Promise<any> {
    return this.settings.upsert({
      key: key,
      value: value
    })
  }

  getSetting (key: string): Promise<string> {
    return this.settings.findOne({
      where: {
        key: key
      }
    }).then(res => res ? res.getDataValue('value') : null)
  }

  getAllPlayers (): Promise<Array<Player>> {
    return this.playerModel.findAll().then(res => res.map(p => p.toJSON()) as Array<Player>)
  }

  setPlayerSummonerId (id: number, summonerId: string) {
    console.log(`Atualizando SID de ${id} para ${summonerId}`)
    this.playerModel.update({
      summonerId: summonerId
    }, {
      where: {
        id: id
      }
    })
  }
}