/** SVG files are imported as text (see `loader` in angular.json) and rendered by app-icon. */
declare module '*.svg' {
  const content: string;
  export default content;
}
