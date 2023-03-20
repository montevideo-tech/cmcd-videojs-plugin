import { roundedToNearstHundredth } from './common';

export class CmcdRequest {
  constructor(player) {
    this.player = player;
    this.vhs = player.tech(true).vhs;
  }

  bufferLengthMs() {
    try {
      const tech = this.player.tech(true);
      const buffered = tech.buffered(); 
      var bufferLength = 0;

      if (buffered.length > 0) {
        const lastBufferedTime = buffered.end(buffered.length - 1);

        if (!isNaN(lastBufferedTime)) { 
          bufferLength = lastBufferedTime - tech.currentTime();
        }
      }

      const bufferLengthMs = bufferLength*1000;
      return bufferLengthMs;
    }
    catch(e) {
      return undefined;
    }
  }

  // This key SHOULD only be sent with an object type of ‘a’, ‘v’ or ‘av’.
  getBufferLength() { 
    try {
      const bufferLengthMs = this.bufferLengthMs();
      return roundedToNearstHundredth(bufferLengthMs);
    }
    catch (e) {
      return undefined;
    }
    
  }

  getDeadline() {
    try {
      const bufferLength = this.bufferLengthMs();
      const playbackRate = this.player.playbackRate()*1000;
      const deadline = Math.round(bufferLength / playbackRate);
      return roundedToNearstHundredth(deadline);
    }
    catch(e) {
      return undefined;
    }
  }

  getMeasuredThroughput() {
    try {
      const bandwidth = Math.round(this.vhs.systemBandwidth / 1000);
      return roundedToNearstHundredth(bandwidth);
    }
    catch(e) {
      return undefined;
    }
  }

  getNextObjectRequest(actualURIrequest) {
    try {
      let nextObject = undefined;

      if (this.player.duration().toString() !== 'Infinity' && this.player.duration() !== 0) {  
        // This logic doesnt work when is live video
        const segments = this.vhs.playlists.media().segments;
        const segmentIndexFind = segments.findIndex(seg => seg.resolvedUri === actualURIrequest);
        if (segmentIndexFind !== -1 && segmentIndexFind !== segments.length) {
          nextObject = segments[segmentIndexFind+1].uri;
        }
      }

      return nextObject;
    }
    catch(e) {
      return undefined;
    }
  }

  getNextRangeRequest() {
    //TODO
    return undefined;
  }

  getKeys(actualURIrequest, isWaitingEvent) {
    return {
      bl: this.getBufferLength(),
      dl: this.getDeadline(),
      mtp: this.getMeasuredThroughput(),
      nor: this.getNextObjectRequest(actualURIrequest),
      nrr: this.getNextRangeRequest(),
      su: isWaitingEvent
    }
  }
}