export async function dataUrlToJpeg(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
