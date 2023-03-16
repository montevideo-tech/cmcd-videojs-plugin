import videojs from 'video.js';
import { version as VERSION } from '../package.json';
import { CmcdRequest } from './cmcdKeys/cmcdRequest';
import { CmcdObject } from './cmcdKeys/cmcdObject';
import { CmcdSession } from './cmcdKeys/cmcdSession';

// Default options for the plugin.
const defaults = {};

/**
 * An advanced Video.js plugin. For more information on the API
 *
 * See: https://blog.videojs.com/feature-spotlight-advanced-plugins/
 */
class Cmcd {

  /**
   * Create a Cmcd plugin instance.
   *
   * @param  {Object} [options]
   *         An optional options object.
   *
   *         While not a core part of the Video.js plugin architecture, a
   *         second argument of options is a convenient way to accept inputs
   *         from your plugin's caller.
   */
  constructor(options) {
    this.options = videojs.obj.merge(defaults, options);
    const player = this;
    const sid = crypto.randomUUID();

    this.ready(() => {
      this.addClass('vjs-cmcd');

      this.tech().vhs.xhr.beforeRequest = function(opts) {

        const cmcdRequest = new CmcdRequest(player);
        const keyRequest = cmcdRequest.getKeys();
        const cmcdObject = new CmcdObject(player);
        const keyObject = cmcdObject.getKeys(opts.uri);
        const cmcdSession = new CmcdSession(player,sid);
        const keySession = cmcdSession.getKeys(player.currentSrc());

        const cmcdKeysObject = Object.assign({}, keyRequest, keyObject, keySession);

        console.log(cmcdKeysObject);

        if (opts.uri.match(/\?./)) {
          opts.uri += `&CMCD=${buildQueryString(cmcdKeysObject)}`;
        } else {
          opts.uri += `?CMCD=${buildQueryString(cmcdKeysObject)}`;
        }

        return opts;
      };

    });
  }
}

function buildQueryString(obj) {
  let query = '';

  const sortedObj = Object.keys(obj).sort().reduce((objEntries, key) => {
    if (obj[key] !== undefined) {
      objEntries[key] = obj[key];
    }
    return objEntries;
  }, {});

  for (const [key, value] of Object.entries(sortedObj)) {
    query += `${key}=${value},`;
  }
  return encodeURIComponent(query.slice(0, -1));
}

// Define default values for the plugin's `state` object here.
// Cmcd.defaultState = {};

// Include the version number.
Cmcd.VERSION = VERSION;

// Register the plugin with video.js.
videojs.registerPlugin('cmcd', Cmcd);

export default Cmcd;
