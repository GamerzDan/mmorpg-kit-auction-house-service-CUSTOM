import fastify from 'fastify'
import authPlugin from 'fastify-auth'
import { PrismaClient as AuctionClient } from './prisma/generated/auction-client'
import { PrismaClient as MailClient } from './prisma/generated/mail-client'
import * as dotenv from 'dotenv'
import { CreateAuctionForm, BidForm, BuyoutForm } from './interfaces'
import { DateTime } from 'luxon';

const auctionClient = new AuctionClient()
const mailClient = new MailClient()
dotenv.config()

const server = fastify()
    .register(authPlugin)
    .after(() => {
        server.get('/', {
            preHandler: server.auth([

            ]),
        }, async (request, reply) => {
            const query: any = request.query
            const limit = query.limit ? query.limit : 20
            const page = query.page ? query.page : 1
            const list = await auctionClient.auction.findMany({
                where: {
                    isEnd: false
                },
                skip: (page - 1) * limit,
                take: limit,
            })
            reply.code(200).send({
                list,
                limit,
                page,
            })
        })

        server.get('/:id', {
            preHandler: server.auth([

            ]),
        }, async (request, reply) => {
            const params: any = request.params
            const id = params.id
            const auction: any = await auctionClient.auction.findUnique({
                where: {
                    id: id
                }
            })
            if (!auction) {
                reply.code(400)
                return
            }
            reply.code(200).send(auction)
        })

        server.get('/history', {
            preHandler: server.auth([

            ]),
        }, async (request, reply) => {
            const query: any = request.query
            const limit = query.limit ? query.limit : 20
            const page = query.page ? query.page : 1
            const userId = "" // TODO: Implement this
            const list = await auctionClient.auction.findMany({
                where: {
                    isEnd: false,
                    sellerId: userId,
                },
                skip: (page - 1) * limit,
                take: limit,
            })
            reply.code(200).send({
                list,
                limit,
                page,
            })
        })

        server.post<{ Body: CreateAuctionForm }>('/internal/auction', {
            preHandler: server.auth([
                
            ]),
        }, async (request, reply) => {
            const form: CreateAuctionForm = request.body
            const newAuction = await auctionClient.auction.create({
                data: {
                    buyoutPrice: form.buyoutPrice,
                    bidPrice: form.startPrice,
                    startBidPrice: form.startPrice,
                    sellerId: form.sellerId,
                    sellerName: form.sellerName,
                    itemDataId: form.itemDataId,
                    itemLevel: form.itemLevel,
                    itemAmount: form.itemAmount,
                    itemDurability: form.itemDurability,
                    itemExp: form.itemExp,
                    itemLockRemainsDuration: form.itemLockRemainsDuration,
                    itemExpireTime: form.itemExpireTime,
                    itemRandomSeed: form.itemRandomSeed,
                    itemSockets: form.itemSockets,
                }
            })
            if (!newAuction) {
                reply.code(500)
                return
            }
            reply.code(200)
        })

        server.post<{ Body: BidForm }>('/internal/bid', {
            preHandler: server.auth([
                
            ]),
        }, async (request, reply) => {
            const form: BidForm = request.body
            const updateResult = await auctionClient.auction.updateMany({
                where: {
                    id: form.id,
                    bidPrice: {
                        lt: form.price,
                    },
                    isEnd: false,
                },
                data: {
                    bidPrice: form.price,
                    buyerId: form.userId,
                    buyerName: form.characterName
                }
            })
            if (updateResult.count === 0) {
                reply.code(500)
                return
            }
            // TODO: Create mail to return bidding money
            reply.code(200)
        })

        server.post<{ Body: BuyoutForm }>('/internal/buyout', {
            preHandler: server.auth([
                
            ]),
        }, async (request, reply) => {
            const form: BuyoutForm = request.body
            const updateResult = await auctionClient.auction.updateMany({
                where: {
                    id: form.id,
                    isEnd: false,
                },
                data: {
                    buyerId: form.userId,
                    buyerName: form.characterName,
                    isBuyout: true,
                    isEnd: true,
                    endedAt: DateTime.local().toJSDate(),
                }
            })
            if (updateResult.count === 0) {
                reply.code(500)
                return
            }
            // TODO: Create mail to send item
            reply.code(200)
        })
    })


server.listen(Number(process.env['PORT']), String(process.env['ADDRESS']), (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
})