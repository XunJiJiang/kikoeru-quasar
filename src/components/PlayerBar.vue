<template>
  <div
    class="row bg-white text-black relative"
    :style="{
      height: currentPlayingFile.hash && hide ? (isTriggeringSeek ? '120px' : '60px') : 0,
      top: currentPlayingFile.hash && hide ? 0 : 12,
      overflow: 'hidden',
      transition: 'all 0.3s ease',
    }"
  >
    <q-item clickable style="padding: 0px 5px;" class="col non-selectable relative">
      <q-item class="absolute-bottom" style="padding: 5px; z-index: 1; pointer-events: none;">
        <q-item-section avatar>
          <custom-img transition="fade" :src="samCoverUrl" style="height: 50px; width: 50px" class="rounded-borders" />
        </q-item-section>

        <q-item-section>
          <q-item-label lines="2">{{ currentPlayingFile.title }}</q-item-label>
          <q-item-label caption lines="1">{{ currentPlayingFile.workTitle }}</q-item-label>
        </q-item-section>
      </q-item>

      <div
        class="absolute"
        :style="{
          top: 0,
          left: 0,
          bottom: 0,
          width: (currentTime / duration) * 100 + '%',
          transition: 'all 0.5s ease',
          backgroundColor: '#2796',
        }"
      ></div>

      <div
        class="absolute"
        :style="{
          top: 0,
          left: 0,
          bottom: 0,
          opacity: isTriggeringSeek ? '1' : '0',
          transition: 'opacity 0.3s ease',
          width: dragMaskBackgroundWidth,
          backgroundColor: '#ba45',
        }"
      ></div>

      <div
        ref="progress-drag-mask"
        class=" absolute"
        :style="{
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isTriggeringSeek ? '1' : '0',
          transition: 'all 0.3s ease',
        }"
        @mousedown="startDragProgressMark"
        @touchstart="startDragProgressMark"
      >
        <q-item
          class="absolute awaw"
          :style="{
            left: dragMaskBackgroundWidth,
            transform: parseInt(dragMaskBackgroundWidth) > 50 ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.8s ease',
          }"
        >
          <q-item-section>
            <q-item-label lines="2" style="font-size: 24px;">{{
              formatSeconds(currentTime + seekDuration / 1000)
            }}</q-item-label>
            <q-item-label caption lines="1">{{
              seekDuration >= 0 ? `+${formatSeconds(seekDuration / 1000)}` : `-${formatSeconds(-seekDuration / 1000)}`
            }}</q-item-label>
          </q-item-section>
        </q-item>
      </div>
    </q-item>

    <q-item
      class="absolute"
      style="padding: 0;"
      :style="{
        top: 0,
        right: 0,
        display: 'flex',
        height: '100%',
        alignItems: 'flex-end',
      }"
    >
      <q-btn
        flat
        size="lg"
        icon="skip_previous"
        @click="previousTrack()"
        style="height: 60px; width: 60px"
        class="col-auto gt-sm"
      />
      <q-btn
        flat
        size="lg"
        :icon="playingIcon"
        @click="togglePlaying()"
        style="height: 60px; width: 60px"
        class="col-auto"
      />
      <q-btn
        flat
        size="lg"
        icon="skip_next"
        @click="nextTrack()"
        style="height: 60px; width: 60px"
        class="col-auto gt-sm"
      />
    </q-item>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex';
import CustomImg from './CustomImg.vue';

export default {
  name: 'PlayerBar',

  data() {
    return {
      isDragging: false,
      dragStartX: 0, // 拖动开始时的 X 坐标
      dragCurrentX: 0, // 拖动过程中当前的 X 坐标
      dragThreshold: 10, // 触发拖动操作的阈值
      dragStartWidth: 0, // 开始拖动时拖动条的尺寸
      isTriggeringSeek: false, // 是否触发拖动进度条
    };
  },

  components: {
    CustomImg,
  },

  computed: {
    samCoverUrl() {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const hash = this.currentPlayingFile.hash;
      return hash ? `/api/cover/${hash.split('/')[0]}?type=sam&token=${token}` : '';
    },

    playingIcon() {
      return this.playing ? 'pause' : 'play_arrow';
    },

    /** 拖动条背景色占用宽度 */
    dragMaskBackgroundWidth() {
      if (!this.isTriggeringSeek && !this.isTriggerSeek) {
        return `${(this.currentTime / this.duration) * 100}%`;
      } else {
        return `${((this.currentTime + this.seekDuration / 1000) / this.duration) * 100}%`;
      }
    },

    ...mapState('AudioPlayer', ['hide', 'playing', 'currentTime', 'duration', 'seekDuration', 'isTriggerSeek']),

    ...mapGetters('AudioPlayer', ['currentPlayingFile']),
  },

  methods: {
    ...mapMutations('AudioPlayer', ['SET_IS_TRIGGER_SEEK', 'SET_SEEK_DURATION']),

    toggleHide() {
      this.$store.commit('AudioPlayer/TOGGLE_HIDE');
    },

    togglePlaying() {
      this.$store.commit('AudioPlayer/TOGGLE_PLAYING');
    },

    nextTrack() {
      this.$store.commit('AudioPlayer/NEXT_TRACK');
    },

    previousTrack() {
      this.$store.commit('AudioPlayer/PREVIOUS_TRACK');
    },

    formatSeconds(seconds) {
      let h = Math.floor(seconds / 3600) < 10 ? '0' + Math.floor(seconds / 3600) : Math.floor(seconds / 3600);

      let m =
        Math.floor((seconds / 60) % 60) < 10 ? '0' + Math.floor((seconds / 60) % 60) : Math.floor((seconds / 60) % 60);

      let s = Math.floor(seconds % 60) < 10 ? '0' + Math.floor(seconds % 60) : Math.floor(seconds % 60);

      return h === '00' ? m + ':' + s : h + ':' + m + ':' + s;
    },

    startDragProgressMark(e) {
      e.preventDefault();
      this.dragStartWidth = this.$refs['progress-drag-mask'].offsetWidth;
      if (e.type === 'mousedown') {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragCurrentX = e.clientX;
      } else if (e.type === 'touchstart' && e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragCurrentX = e.touches[0].clientX;
      }
    },
    draggingProgressMark(e) {
      if (!this.isDragging) {
        return;
      }
      e.preventDefault();

      if (e.type === 'mousemove') {
        this.dragCurrentX = e.clientX;
      } else if (e.type === 'touchmove' && e.touches.length === 1) {
        this.dragCurrentX = e.touches[0].clientX;
      } else {
        return;
      }

      if (Math.abs(this.dragCurrentX - this.dragStartX) > this.dragThreshold) {
        this.isTriggeringSeek = true;
      }

      if (this.isTriggeringSeek) {
        const seekDuration = ((this.dragCurrentX - this.dragStartX) / this.dragStartWidth) * this.duration * 1000;

        if (seekDuration + this.currentTime * 1000 > this.duration * 1000) {
          this.SET_SEEK_DURATION(this.duration * 1000 - this.currentTime * 1000);
        } else if (seekDuration + this.currentTime * 1000 < 0) {
          this.SET_SEEK_DURATION(-this.currentTime * 1000);
        } else {
          this.SET_SEEK_DURATION(seekDuration);
        }
      }
    },
    endDragProgressMark() {
      if (!this.isDragging) {
        return;
      }
      this.isDragging = false;
      if (this.isTriggeringSeek) {
        this.SET_IS_TRIGGER_SEEK(true);
        this.isTriggeringSeek = false;
        this.dragStartX = 0;
        this.dragCurrentX = 0;
      } else {
        this.toggleHide();
      }
    },
  },

  mounted() {
    window.addEventListener('mousemove', this.draggingProgressMark);
    window.addEventListener('mouseup', this.endDragProgressMark);
    window.addEventListener('touchmove', this.draggingProgressMark);
    window.addEventListener('touchend', this.endDragProgressMark);
  },
};
</script>
