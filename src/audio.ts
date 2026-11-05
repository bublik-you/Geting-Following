class Soundscape {
  private context?: AudioContext;
  private master?: GainNode;
  muted = false;
  async unlock() {
    try {
      if (!this.context) { this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = .11; this.master.connect(this.context.destination); }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch { /* Presentation remains usable when audio is unavailable. */ }
  }
  setMuted(muted:boolean) { this.muted=muted; if(this.master && this.context) this.master.gain.setTargetAtTime(muted ? 0 : .11,this.context.currentTime,.025); }
  tone(frequency:number,duration=.08,type:OscillatorType='sine',delay=0) {
    if(this.muted || !this.context || !this.master || this.context.state!=='running')return;
    const t=this.context.currentTime+delay, osc=this.context.createOscillator(), envelope=this.context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.8,t+duration);
    envelope.gain.setValueAtTime(0,t);envelope.gain.linearRampToValueAtTime(.32,t+.012);envelope.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.connect(envelope);envelope.connect(this.master);osc.start(t);osc.stop(t+duration+.01);osc.onended=()=>{osc.disconnect();envelope.disconnect();};
  }
  syllable(index:number) { if(index%4===0) this.tone(390+[0,90,40,130,20,60][Math.floor(index/4)%6],.065,'triangle'); }
  travel() { [220,293,392,523].forEach((f,i)=>this.tone(f,.15,'sine',i*.08)); }
  land() { this.tone(180,.12,'triangle'); this.tone(540,.18,'sine',.08); }
}
export const audio = new Soundscape();
