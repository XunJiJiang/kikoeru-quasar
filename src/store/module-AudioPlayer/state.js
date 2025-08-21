export default function() {
  return {
    hide: false,
    playing: false, // 播放状态 (true/false)
    currentTime: 0, // 单位: 秒
    duration: 0,
    source: '',
    queue: [
      // list of tracks. object format:
      /*
        hash: null, // unique identifier for the file
        title: null, // title to show in UI
        workTitle: null // workTitle to show in UI
       */
    ],
    queueIndex: 0, // which track in the queue is currently selected
    playMode: {
      id: 0,
      name: 'order',
    }, // 顺序播放("order"), 循环播放("all repeat"), 单曲循环("repeat once") or 随机播放("shuffle")
    muted: false,
    volume: 0, // 音量 (0.0-1.0)
    currentLyric: '',
    sleepTime: null,
    sleepMode: false,
    rewindSeekTime: 5,
    forwardSeekTime: 30,
    rewindSeekMode: false,
    forwardSeekMode: false,

    // 是否开启了画中画字幕
    hasPictureInPicture: false,
    // 当前字幕文件
    currentSubtitlesFile: '',
    // 当前字幕文件的哈希值
    currentSubtitlesHash: '',
    /**
     * 当前字幕的时间线数组
     * @type {Array<{time: number, text: string}>} - time: 单位: 毫秒, text: 字幕文本
     */
    currentSubtitlesTimeline: [],
  };
}
