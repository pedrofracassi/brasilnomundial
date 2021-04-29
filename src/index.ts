import dotenv from 'dotenv'
dotenv.config()

import Bot from './Bot'

const bot = new Bot()
bot.init()

console.log('Iniciando...')