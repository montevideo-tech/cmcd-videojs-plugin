import { CmcdObjectType } from '@svta/common-media-library/cmcd/CmcdObjectType';
import { CmcdStreamType } from '@svta/common-media-library/cmcd/CmcdStreamType';
import { CmcdStreamingFormat } from '@svta/common-media-library/cmcd/CmcdStreamingFormat';
import { CmcdFormatters } from '@svta/common-media-library/cmcd';

export class CmcdData {
  constructor(player, sid, cid) {
    this.player = player;
    this.vhs = player.tech(true).vhs;
    this.sid = sid;
    this.cid = cid;
  }

  getEncodedBitrate() {
    try {
      const bandwidth = this.player.tech(true).vhs.playlists.media_.attributes.BANDWIDTH;

      const encodedBitrate = CmcdFormatters.br(bandwidth / 1000);

      return encodedBitrate;
    } catch (e) {
      return undefined;
    }
  }

  getObjectDuration(uriBeingRequested) {
    try {
      const playlist = this.player.tech(true).vhs.playlists.media();

      const currentSegmentIndex = playlist.segments.findIndex(segment => segment.resolvedUri === uriBeingRequested);

      const currentSegmentDuration = Math.round(playlist.segments[currentSegmentIndex].duration * 1000);

      return currentSegmentDuration;
    } catch (error) {
      return undefined;
    }
  }

  getObjectType(uriBeingRequested) {
    try {
      const extension = uriBeingRequested.split('.').pop();

      const { MANIFEST, AUDIO, VIDEO, MUXED, CAPTION, OTHER } = CmcdObjectType;
      const supportedExtensions = {
        // Manifest or playlist
        m3u8: MANIFEST,
        mpd: MANIFEST,
        xml: MANIFEST,
        // Audio Only
        m4a: AUDIO,
        amp3ac: AUDIO,
        aac: AUDIO,
        caf: AUDIO,
        flac: AUDIO,
        oga: AUDIO,
        wav: AUDIO,
        // Video Only
        opus: VIDEO,
        ogv: VIDEO,
        mp4: VIDEO,
        mov: VIDEO,
        m4v: VIDEO,
        mkv: VIDEO,
        webm: VIDEO,
        ogg: VIDEO,
        flv: VIDEO,
        // Muxed audio and video
        ts: MUXED,
        m4s: MUXED,
        // Init segment not implemented
        // Caption
        webvtt: CAPTION,
        vtt: CAPTION,
        // ISOBMFF timed text track not implemented
        // Cryptographic key, license or certificate not implemented
        // Other
        jpg: OTHER,
        jpeg: OTHER,
        gif: OTHER,
        png: OTHER,
        svg: OTHER,
        webp: OTHER
      };

      if (supportedExtensions.hasOwnProperty(extension)) {
        if (extension === 'm4s') {
          const media = this.vhs.playlists.media();
          const hasAudioTrack = media.attributes.AUDIO;

          if (hasAudioTrack) {
            const isVideoSegment = media.segments.findIndex(seg => seg.resolvedUri === uriBeingRequested) !== -1;

            return isVideoSegment ? VIDEO : AUDIO;
          }
        }
        return supportedExtensions[extension];
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  getTopBitrate() {
    try {
      const qualitylevels = this.player.qualityLevels().levels_;

      const highestBitrate = qualitylevels.reduce(function(prev, current) {
        return (prev && prev.bitrate > current.bitrate) ? prev : current;
      });

      const topBitrate = CmcdFormatters.tb(highestBitrate.bitrate / 1000);

      return topBitrate;
    } catch (error) {
      return undefined;
    }
  }

  bufferLengthMs() {
    try {
      let bufferLength = 0;
      const tech = this.player.tech(true);
      const buffered = tech.buffered();

      if (buffered.length > 0) {
        const lastBufferedTime = buffered.end(buffered.length - 1);

        if (!isNaN(lastBufferedTime)) {
          bufferLength = lastBufferedTime - tech.currentTime();
        }
      }

      const bufferLengthMs = bufferLength * 1000;

      return bufferLengthMs;
    } catch (e) {
      return undefined;
    }
  }

  getBufferLength() {
    // This key SHOULD only be sent with an object type of ‘a’, ‘v’ or ‘av’.
    try {
      const bufferLengthMs = this.bufferLengthMs();

      return CmcdFormatters.bl(bufferLengthMs);
    } catch (e) {
      return undefined;
    }
  }

  getDeadline() {
    try {
      const bufferLength = this.bufferLengthMs();
      const playbackRate = this.player.playbackRate();
      const deadline = CmcdFormatters.dl(bufferLength / playbackRate);

      return deadline;
    } catch (e) {
      return undefined;
    }
  }

  getMeasuredThroughput() {
    try {
      const bandwidth = CmcdFormatters.mtp(this.vhs.systemBandwidth / 1000);

      return bandwidth;
    } catch (e) {
      return undefined;
    }
  }

  getNextObjectRequest(actualURIrequest) {
    try {
      let nextObject;

      if (this.player.duration().toString() !== 'Infinity' && this.player.duration() !== 0) {
        // This logic doesn't work when is live video
        const segments = this.vhs.playlists.media().segments;
        const segmentIndexFind = segments.findIndex(seg => seg.resolvedUri === actualURIrequest);

        if (segmentIndexFind !== -1 && segmentIndexFind !== segments.length) {
          nextObject = segments[segmentIndexFind + 1].uri;
        }
      }

      return nextObject;
    } catch (e) {
      return undefined;
    }
  }

  getNextRangeRequest() {
    // TODO
    return undefined;
  }

  generateHashCode(string) {
    let hash = 0;

    if (string.length === 0) {
      return hash;
    }
    for (let i = 0; i < string.length; i++) {
      const chr = string.charCodeAt(i);

      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash;
  }

  getContentId(src) {
    if (this.cid) {
      return this.cid;
    }
    try {
      const cid = this.generateHashCode(src);

      return cid.toString();
    } catch (e) {
      return undefined;
    }
  }

  getPlaybackRate() {
    try {
      const rate = this.player.playbackRate();

      if (rate === 1) {
        return 1;
      } else if (rate === 0) {
        return 0;
      }
      return 2;
    } catch (e) {
      return undefined;
    }
  }

  getStreamingFormat() {
    try {
      const type = this.player.currentType();

      if (type === 'application/dash+xml') {
        return CmcdStreamingFormat.DASH;
      } else if (type === 'application/x-mpegURL') {
        return CmcdStreamingFormat.HLS;
      } else if (type === 'application/vnd.ms-sstr+xml') {
        return CmcdStreamingFormat.SMOOTH;
      } return CmcdStreamingFormat.OTHER;
    } catch (e) {
      return undefined;
    }
  }

  getStreamType() {
    try {
      // It is a live video
      if (this.player.duration().toString() === 'Infinity' || this.player.duration() === 0) {
        return CmcdStreamType.LIVE;
      }
      // else it is a vod video
      return CmcdStreamType.VOD;
    } catch (e) {
      return undefined;
    }
  }

  getVersion() {
    return 1;
  }

  getBufferStarvation(isWaitingEvent) {
    try {
      return isWaitingEvent;
    } catch (e) {
      return undefined;
    }
  }

  getRequestedMaximumThroughput() {
    // TODO
    return undefined;
  }

  getKeys(uri, isWaitingEvent, src) {
    const res = {
      br: this.getEncodedBitrate(),
      d: this.getObjectDuration(uri),
      ot: this.getObjectType(uri),
      tb: this.getTopBitrate()
    };

    if ([CmcdObjectType.AUDIO, CmcdObjectType.VIDEO, CmcdObjectType.MUXED].includes(res.ot)) {
      res.bl = this.getBufferLength();
    }
    res.dl = this.getDeadline();
    res.mtp = this.getMeasuredThroughput();
    const nor = this.getNextObjectRequest(uri);

    if (nor) {
      res.nor = nor;
    }

    const nrr = this.getNextRangeRequest();

    if (nrr) {
      res.nrr = this.getNextRangeRequest();
    }
    if (isWaitingEvent !== false) {
      res.su = isWaitingEvent;
    }

    res.cid = this.getContentId(src);
    if (this.getPlaybackRate() !== 1) {
      res.pr = this.getPlaybackRate();
    }
    res.sf = this.getStreamingFormat();
    res.sid = this.sid;
    res.st = this.getStreamType();
    if (this.getVersion() !== 1) {
      res.v = this.getVersion();
    }

    if (isWaitingEvent !== false) {
      res.bs = this.getBufferStarvation(isWaitingEvent);
    }
    res.rtp = this.getRequestedMaximumThroughput();

    return res;
  }
}
