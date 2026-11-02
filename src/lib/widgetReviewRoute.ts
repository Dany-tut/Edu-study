/** A normal app route works in direct links and without opening a popup. */
export const WIDGET_REVIEW_PATH = '/teacher/widget-sizes'
export const WIDGET_REVIEW_HASH = '#/teacher/widget-sizes'
export function isWidgetReviewRoute(location: { pathname: string; search: string; hash: string }): boolean {
  return location.pathname.replace(/\/+$/, '') === WIDGET_REVIEW_PATH ||
    location.hash.split('?')[0] === WIDGET_REVIEW_HASH ||
    new URLSearchParams(location.search).get('widget-sizes') === '1'
}
