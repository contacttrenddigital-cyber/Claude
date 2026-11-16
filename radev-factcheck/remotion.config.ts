import {Config} from '@remotion/cli/config';
import fs from 'fs';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setAudioCodec('aac');
Config.setPixelFormat('yuv420p');
Config.setCrf(17);
Config.setColorSpace('bt709');
Config.setOverwriteOutput(true);

// По избор: готов браузър (напр. в среда без достъп за автоматично сваляне).
const browser = process.env.REMOTION_BROWSER;
if (browser && fs.existsSync(browser)) {
  Config.setBrowserExecutable(browser);
}
