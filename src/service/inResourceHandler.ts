'use strict'
import { join, parse } from 'node:path/posix'

import { DOT, PATH_SEP } from '../constant/fsConstants.js'
import { METAFILE_SUFFIX, META_REGEX } from '../constant/metadataConstants.js'
import { pathExists, readDir } from '../utils/fsHelper.js'

import StandardHandler from './standardHandler.js'

export default class ResourceHandler extends StandardHandler {
  protected metadataName: string | undefined

  public override async handleAddition() {
    this.metadataName = this._getMetadataName()
    await super.handleAddition()
    if (!this.config.generateDelta) return

    await this._copyResourceFiles()
  }

  public override async handleDeletion() {
    const [, elementPath, elementName] = this._parseLine()!
    const exists = await pathExists(join(elementPath, elementName), this.config)
    if (exists) {
      await this.handleModification()
    } else {
      await super.handleDeletion()
    }
  }

  protected async _copyResourceFiles() {
    const staticResourcePath = this.metadataName!.substring(
      0,
      this.metadataName!.lastIndexOf(PATH_SEP)
    )
    const allStaticResources = await readDir(
      staticResourcePath,
      this.work.config
    )
    const resourceFiles = allStaticResources.filter((file: string) =>
      file.startsWith(this.metadataName!)
    )
    for (const resourceFile of resourceFiles) {
      await this._copy(resourceFile)
    }
  }

  protected override _getElementName() {
    const parsedPath = this._getParsedPath()
    return parsedPath.name
  }

  protected override _getParsedPath() {
    const base =
      !this.metadataDef.excluded && this.ext === this.metadataDef.suffix
        ? this.splittedLine.at(-1)!
        : this.splittedLine[
            this.splittedLine.indexOf(this.metadataDef.directoryName) + 1
          ]
    return parse(base.replace(META_REGEX, ''))
  }

  protected override _isProcessable() {
    return true
  }

  protected _getMetadataName() {
    const resourcePath = []
    for (const pathElement of this.splittedLine) {
      if (resourcePath.slice(-2)[0] === this.metadataDef.directoryName) {
        break
      }
      resourcePath.push(pathElement)
    }
    const lastPathElement = resourcePath[resourcePath.length - 1]
      .replace(METAFILE_SUFFIX, '')
      .split(DOT)
    if (lastPathElement.length > 1) {
      lastPathElement.pop()
    }

    resourcePath[resourcePath.length - 1] = lastPathElement.join(DOT)
    return `${resourcePath.join(PATH_SEP)}`
  }

  protected override _getMetaTypeFilePath() {
    return `${this.metadataName}.${this.metadataDef.suffix}${METAFILE_SUFFIX}`
  }

  protected override _shouldCopyMetaFile(): boolean {
    return true
  }
}
