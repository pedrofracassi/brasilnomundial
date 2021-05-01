import Twit from "twit"

export default class TwitterAPI {
  twit: Twit

  constructor () {
    this.twit = new Twit({
      consumer_key: process.env.TWITTER_CONSUMER_KEY!,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET!,
      access_token: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    })
  }

  tweet (text: string, replyTo?: string | undefined) {
    const replyObject = replyTo ? { in_reply_to_status_id: replyTo } : {}
    return this.twit.post('statuses/update', { status: text, ...replyObject })
  }
}