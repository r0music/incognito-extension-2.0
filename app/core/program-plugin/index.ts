import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"
import { ProgramPlugin } from "./types"
import { createLogger } from "../utils"
import { SplPlugin } from "./plugins/spl"
import { DecodedInstruction, Markdown, Network, Ricardian, Token } from "../types"
import { SolanaPlugin } from "./plugins/system"
import { TokenProvider } from "../../background/store"

const log = createLogger("sol:decoder")

interface ProgramPluginManagerOpt {
  tokenProvider: TokenProvider
  getConnection: () => Connection
  getNetwork: () => Network
  getSPLToken: (
    publicKey: PublicKey,
    connection: Connection,
    network: Network,
    tokenProvider: TokenProvider
  ) => Promise<Token | undefined>
}

export class ProgramPluginManager {
  private supportedProgramId: Record<string, ProgramPlugin>
  private opts: ProgramPluginManagerOpt

  constructor(opts: ProgramPluginManagerOpt) {
    this.supportedProgramId = {}
    this.opts = opts
    this._setupPlugins()
  }

  renderTransactionItemMarkdown = async (transaction: Transaction): Promise<Markdown[]> => {
    const rd = (idx: number, instruction: TransactionInstruction): Markdown => {
      return {
        type: "markdown",
        content: `Unknown instruction #${idx + 1} for program ${instruction.programId}`,
      }
    }

    const ri = (plugin: ProgramPlugin, decodedInstruction: DecodedInstruction): Markdown => {
      return plugin.getMarkdown(decodedInstruction)
    }

    return this.render<Markdown>(transaction, rd, ri)
  }

  renderRicardian = async (transaction: Transaction): Promise<Ricardian[]> => {
    const rd = (idx: number, instruction: TransactionInstruction): Ricardian => {
      return {
        type: "ricardian",
        content: `Unknown instruction #${idx + 1} for program ${instruction.programId}`,
      }
    }

    const ri = (plugin: ProgramPlugin, decodedInstruction: DecodedInstruction): Ricardian => {
      return plugin.getRicardian(decodedInstruction)
    }

    return this.render<Ricardian>(transaction, rd, ri)
  }

  render = async <T extends Markdown | Ricardian>(
    transaction: Transaction,
    renderUndecodedInsutrction: (idx: number, instruction: TransactionInstruction) => T,
    renderInstruction: (plugin: ProgramPlugin, decodedInstruction: DecodedInstruction) => T
  ): Promise<T[]> => {
    const decodeInstructionFunc = async (
      idx: number,
      instruction: TransactionInstruction
    ): Promise<T> => {
      const programId = instruction.programId
      log("Finding decoder for program [%s]", programId)
      const plugin = this._getPlugin(instruction.programId)

      if (plugin == null) {
        log("Unable to retrieve decoder for program [%s]", programId)
        return renderUndecodedInsutrction(idx, instruction)
      }

      let decodedInstruction: DecodedInstruction
      log("Decoding transaction instruction for program [%s]", programId)
      try {
        decodedInstruction = plugin.decode(instruction)
      } catch (error) {
        log("An error occurred when decoding instruction for program [%s] %o", programId, error)
        return renderUndecodedInsutrction(idx, instruction)
      }

      log("Decorating transaction instruction for program [%s]", programId)
      try {
        decodedInstruction = await plugin.decorate(decodedInstruction, {
          getConnection: this.opts.getConnection,
          getSPLToken: this.opts.getSPLToken,
          tokenProvider: this.opts.tokenProvider,
          getNetwork: this.opts.getNetwork,
        })
      } catch (error) {
        log("An error occurred when decorating instruction for program [%s] %o", programId, error)
        return renderUndecodedInsutrction(idx, instruction)
      }

      try {
        return renderInstruction(plugin, decodedInstruction)
      } catch (error) {
        log("An error occurred when renderin instruction: %o", error)
        return renderUndecodedInsutrction(idx, instruction)
      }
    }

    // Promise.all rejects as soon as one promise rejects, so we must make sure that `decodeInstruction` never fail
    return Promise.all(
      transaction.instructions.map((instruction, index) =>
        decodeInstructionFunc(index, instruction)
      )
    )
  }

  _setupPlugins = (): void => {
    log("registering plugins")
    this._registerProgramPlugin(
      new PublicKey("TokenSVp5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o"),
      new SplPlugin()
    )
    this._registerProgramPlugin(SystemProgram.programId, new SolanaPlugin())
    // this._registerProgramPlugin(DEX_PROGRAM_ID, new SerumDecoder())
  }

  _registerProgramPlugin = (programId: PublicKey, plugin: ProgramPlugin): void => {
    this.supportedProgramId[programId.toBase58()] = plugin
  }

  _getPlugin = (programId: PublicKey): ProgramPlugin | undefined => {
    return this.supportedProgramId[programId.toBase58()]
  }
}
