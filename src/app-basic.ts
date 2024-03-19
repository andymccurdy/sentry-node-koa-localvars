import * as fs from 'fs'
import * as path from 'path'
import * as Koa from 'koa'
import * as KoaRouter from 'koa-router'
import * as Sentry from '@sentry/node'


function startApp(): void {
    const { version } = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), { encoding: 'utf8' })
    ) as Record<string, string>

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        enabled: true,
        environment: 'dev',
        includeLocalVariables: true,
        integrations: [
            Sentry.localVariablesIntegration({
              captureAllExceptions: true,
            }),
        ],
        release: version
    });


    // Set up global exception/rejection handlers
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception!')
    })

    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Promise Rejection!')
    })

    // routing
    const router = new KoaRouter()
    router.get('/error/async', errorAsync)
    router.get('/error/sync', errorSync)

    // middleware
    const app = new Koa()
    app.use(handleErrorMiddleware)
    app.use(router.routes())
    app.use(router.allowedMethods())


    app.listen({port: 3000})
}

// middleware to catch errors and send them to sentry
export async function handleErrorMiddleware(ctx: Koa.Context, next): Promise<void> {
    const someValue = 'some value'

    try {
        await next()
    } catch (err: any) {
        Sentry.withScope((scope) => {
            scope.addEventProcessor((event) => {
                return Sentry.addRequestDataToEvent(event, ctx.request as any)
            })
            Sentry.captureException(err)
        })

        ctx.status = 500
        ctx.body = {
            message: `Error encountered: ${someValue}`
        }
    }
}

// request handler that makes a failing async call
async function errorAsync(ctx: Koa.Context, next: Koa.Next): Promise<any> {
    const defaultValue = 'Async Value'
    const value = (ctx.query.value instanceof Object ? ctx.query.value[0] : ctx.query.value) ?? defaultValue

    await someAsyncFunc(ctx, value)

    // this is unreachable, someAsyncFunc always throws
    ctx.status = 200
    ctx.body = {
        foo: 'bar'
    }

    await next()
}

async function someAsyncFunc(ctx: Koa.Context, value: string): Promise<void> {
    // async call forcing node to swap stack and locals
    await new Promise(resolve => setTimeout(resolve, 50))
    syncStepA(value)
}

// request handler that makes a failing sync call
async function errorSync(ctx: Koa.Context, next: Koa.Next): Promise<any> {
    const defaultValue = 'Sync Value'
    const value = (ctx.query.value instanceof Object ? ctx.query.value[0] : ctx.query.value) ?? defaultValue

    someSyncFunc(ctx, value)

    // this is unreachable, someSyncFunc always throws
    ctx.status = 200
    ctx.body = {
        foo: 'bar'
    }

    await next()
}

function someSyncFunc(ctx: Koa.Context, value: string): void {
    syncStepA(value)
}

function syncStepA(value: string): void {
    const nextValue = 234
    syncStepB(value, nextValue)
}

function syncStepB(value: string, bValue: number): void {
    const localVar = 'some local var'
    throw new Error(`Error! ${value} | ${bValue} | ${localVar}`)
}

startApp()