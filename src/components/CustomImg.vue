<template>
  <div
    :class="['custom-img-root', imgClass]"
    :style="computedStyle"
    @mouseover="handleMouseOver"
    @mouseout="handleMouseOut"
  >
    <img class="custom-img" :src="src" :alt="alt" :style="imgStyle" />
    <div class="custom-img-overlay"><slot></slot></div>
  </div>
</template>

<script>
export default {
  name: 'CustomImg',

  props: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: '',
    },
    ratio: {
      type: Number,
      default: null,
    },
    imgClass: {
      type: String,
      default: '',
    },
    transition: {
      type: String,
      default: '',
    },
    style: {
      type: String,
      default: '',
    },
  },

  data() {
    return {};
  },

  computed: {
    computedStyle() {
      const baseStyle = this.style ? this.style : '';
      const ratioStyle = this.ratio ? `` : '';
      return `${baseStyle} ${ratioStyle}`;
    },

    imgStyle() {
      return this.transition ? `transition: ${this.transition};` : '';
    },
  },

  methods: {
    handleMouseOver() {
      this.$emit('mouseover');
    },

    handleMouseOut() {
      this.$emit('mouseout');
    },
  },
};
</script>

<style>
.custom-img-root {
  position: relative;
  width: 100%;
  display: inline-block;
  vertical-align: middle;
  overflow: hidden;
  padding: 0;
}

.custom-img {
  /* position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0; */
  display: block;
  width: 100%;
  height: auto;
}

.custom-img-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.custom-img-root:hover .custom-img-overlay {
  opacity: 1;
}
</style>
