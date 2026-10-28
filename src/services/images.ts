import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";

const directory = () => new Directory(Paths.document, "inbox-images");

export function imageUri(filename: string) {
  return new File(directory(), filename).uri;
}

export function persistImage(source: string): string {
  const folder = directory();
  folder.create({ idempotent: true, intermediates: true });
  const extension =
    source.split("?")[0].match(/\.(jpe?g|png|webp|gif|heic|avif)$/i)?.[1] ??
    "jpg";
  const filename = `${Crypto.randomUUID()}.${extension}`;
  new File(source).copy(new File(folder, filename));
  return filename;
}

export function removeImage(filename: string) {
  const file = new File(directory(), filename);
  if (file.exists) file.delete();
}
