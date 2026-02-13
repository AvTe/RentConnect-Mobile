/**
 * Production-safe logger utility
 * Only outputs logs in development mode (__DEV__)
 * Usage: import { logger } from '../lib/logger';
 *        logger.log('message', data);
 *        logger.warn('warning', data);
 *        logger.error('error', data);  // errors always log
 */

export const logger = {
    log: (...args) => {
        if (__DEV__) {
            console.log(...args);
        }
    },
    warn: (...args) => {
        if (__DEV__) {
            console.warn(...args);
        }
    },
    error: (...args) => {
        // Errors always log (useful for crash reporting services)
        console.error(...args);
    },
    info: (...args) => {
        if (__DEV__) {
            console.info(...args);
        }
    },
};

export default logger;
