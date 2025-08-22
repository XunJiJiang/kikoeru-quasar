export default {
  methods: {
    /**
     * Formats a RJ code into a more readable string.
     * @param {number} id RJ code
     * @returns {string} Formatted RJ code
     */
    formatRjCode(id) {
      if (id < 1000000) {
        return `000000${id}`.slice(-6);
      } else if (id < 100000000) {
        return `00000000${id}`.slice(-8);
      } else {
        const str = `${id}`;
        if (str.length % 2 === 0) {
          return str;
        } else {
          return `0${str}`;
        }
      }
    },

    /** 计算字符串宽度 */
    getStringWidth(str, style) {
      const strDom = document.createElement('span');
      for (const key in style) {
        strDom.style[key] = style[key];
      }
      strDom.style.position = 'absolute';
      strDom.style.visibility = 'hidden';
      strDom.style.pointerEvents = 'none';
      strDom.textContent = str;
      document.body.appendChild(strDom);
      const width = strDom.offsetWidth;
      document.body.removeChild(strDom);
      return width;
    },
  },
};
