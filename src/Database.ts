import { DataTypes, Model, ModelCtor, Sequelize } from "sequelize";

export interface Player {
  id: number,
  name: string,
  summonerName: string,
  summonerId: string,
  createdAt: Date,
  updatedAt: Date
}

export default class Database {
  sequelize: Sequelize
  playerModel: ModelCtor<Model>

  constructor () {
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: 'db.sqlite',
    })

    this.playerModel = this.sequelize.define('Player', {
      name: DataTypes.STRING,
      summonerName: DataTypes.STRING,
      summonerId: DataTypes.STRING
    }, { underscored: true } )
    
    this.sequelize.sync()
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