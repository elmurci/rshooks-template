import { Client, type Invoke, SetHookFlags, Wallet } from '@transia/xrpl'

import { ExecutionUtility, type SetHookParams, Xrpld, createHookPayload, setHooksV3 } from '@transia/hooks-toolkit'
import type { TransactionMetadata } from '@transia/xahau-models'

async function main() {
  if (process.argv.length < 4) {
    console.log('Usage: pnpm run deploy <seed> <hookFile>')
    process.exit(1)
  }

  // Example: XRPLD_ENV=prod pnpm run deploy sa9b...AuU8 ../build/index

  const seed = process.argv[2]
  const hookFile = process.argv[3]
  const endpoint = 'wss://xahau-test.net'
  const client = new Client(process.env.XRPLD_WSS || endpoint)
  const wallet = Wallet.fromSeed(seed || '')

  console.log('Connecting to', endpoint)
  await client.connect()

  client.networkID = await client.getNetworkID()
  console.log('Connected! Network ID', client.networkID)

  try {
    const hookPayload = createHookPayload({
      createFile: hookFile,
      namespace: 'base',
      version: 0,
      flags: SetHookFlags.hsfOverride,
      hookOnArray: ['Invoke'],
    })
    console.log('Hook Payload', hookPayload)

    const setHook = await setHooksV3({
      client: client,
      seed: seed,
      hooks: [{ Hook: hookPayload }],
    } as SetHookParams)

    const builtTx: Invoke = {
      TransactionType: 'Invoke',
      Account: wallet.classicAddress,
    }

    const result = await Xrpld.submit(client, {
      wallet: wallet,
      tx: builtTx,
    })

    console.log('result', result)

    const hookExecutions = await ExecutionUtility.getHookExecutionsFromMeta(client, result.meta as TransactionMetadata)
    console.log(hookExecutions.executions[0].HookReturnString)
  } catch (e) {
    console.error(e)
  } finally {
    await client.disconnect()
    process.exit(0)
  }
}

main()
