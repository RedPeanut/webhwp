/**
 * Copyright Han Lee <hanlee.dev@gmail.com> and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { StreamDirectoryEntry, StorageDirectoryEntry, CompoundFile } from '@webhwp/compound-file-js'
import { inflate } from 'pako'
import HWPDocument from '../models/document'
import DocInfo from '../models/docInfo'
import HWPHeader from '../models/header'
import HWPVersion from '../models/version'
import Section from '../models/section'
import DocInfoParser from './DocInfoParser'
import SectionParser from './SectionParser'

//@link https://github.com/hahnlee/hwp.js/blob/master/docs/hwp/5.0/FileHeader.md#%ED%8C%8C%EC%9D%BC-%EC%9D%B8%EC%8B%9D-%EC%A0%95%EB%B3%B4
//const FILE_HEADER_BYTES = 256

const SUPPORTED_VERSION = new HWPVersion(5, 1, 0, 0)
const SIGNATURE = 'HWP Document File'

function parseFileHeader(container: CompoundFile): HWPHeader {

  const fileHeader = container.getRootStorage().findChild(
    (entry) => 'FileHeader' === entry.getDirectoryEntryName()
  ) as StreamDirectoryEntry

  if (!fileHeader)
    throw new Error('Cannot find FileHeader')

  /* Header.ts 에서 수행
  if (view.getSize() !== FILE_HEADER_BYTES)
    throw new Error(`FileHeader must be ${FILE_HEADER_BYTES} bytes, Received: ${view.getSize()}`) */

  const signature = String.fromCharCode(...fileHeader.getStreamData().slice(0, 17))

  if (SIGNATURE !== signature)
    throw new Error(`hwp file's signature should be '${SIGNATURE}'. Received version: '${signature}'`)

  const [major, minor, build, revision] = fileHeader.getStreamData().slice(32, 36).reverse()
  const version = new HWPVersion(major, minor, build, revision)

  if (!version.isCompatible(SUPPORTED_VERSION))
    throw new Error(`hwp.js only support '${SUPPORTED_VERSION}' format. Received version: '${version}'`)

  return new HWPHeader(version, signature)
}

function parseDocInfo(container: CompoundFile): DocInfo {
  const docInfoEntry = container.getRootStorage().findChild(
    (entry) => 'DocInfo' === entry.getDirectoryEntryName()
  ) as StreamDirectoryEntry

  if (!docInfoEntry)
    throw new Error('DocInfo not exist')

  const content: Uint8Array = new Uint8Array(docInfoEntry.getStreamData())
  const decodedContent: Uint8Array = inflate(content, { windowBits: -15 })

  return new DocInfoParser(decodedContent, container).parse()
}

function parseSection(container: CompoundFile, sectionNumber: number): Section {
  const bodyText = container.getRootStorage().findChild(
    (entry) => 'BodyText' === entry.getDirectoryEntryName()
  ) as StorageDirectoryEntry

  const entryName = `Section${sectionNumber}`
  const section = bodyText.findChild(
    (entry) => entryName === entry.getDirectoryEntryName()
  ) as StreamDirectoryEntry

  if (!section)
    throw new Error('Section not exist')

  const content: Uint8Array = new Uint8Array(section.getStreamData())
  const decodedContent: Uint8Array = inflate(content, { windowBits: -15 })

  return new SectionParser(decodedContent).parse()
}

function parse(array: Uint8Array): HWPDocument {
  const container = CompoundFile.fromUint8Array(array)

  const header = parseFileHeader(container)
  const docInfo = parseDocInfo(container)

  const sections: Section[] = []
  for (let i = 0; i < docInfo.sectionSize; i += 1) {
    sections.push(parseSection(container, i))
  }

  return new HWPDocument(header, docInfo, sections)
}

export default parse
