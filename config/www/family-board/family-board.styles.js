/* Family Board - styles and tokens
 * SPDX-License-Identifier: MIT
 */

import { getHaLit } from './ha-lit.js';

export function fbStyles() {
    const { css } = getHaLit();

    return css`
        :host {
            --palette-mint: #b9fbc0;
            --palette-aqua: #98f5e1;
            --palette-cyan: #8eecf5;
            --palette-sky: #90dbf4;
            --palette-bluegrey: #a3c4f3;
            --palette-lilac: #cfbaf0;
            --palette-rose: #ffcfd2;
            --palette-vanilla: #fbf8cc;

            --fb-bg: color-mix(in srgb, #00ced1 18%, #ffffff);
            --fb-surface: #ffffff;
            --fb-surface-2: #f4fbfa;
            --fb-surface-3: #edf7f6;
            --fb-text: color-mix(in srgb, var(--primary-text-color) 20%, #1f2937);
            --fb-muted: color-mix(in srgb, var(--secondary-text-color) 30%, #6b7280);
            --fb-accent: var(--palette-lilac);
            --fb-grid: #e6e1db;
            --fb-today: #eef7f6;
            --fb-weekend: #e8f3f2;
            --fb-pill-text: var(--primary-text-color);
            --fb-print-text: var(--primary-text-color);
            --fb-radius: 12px;
            --fb-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
            --fb-border: #e8e2dc;

            --fb-icon: var(--primary-text-color);

            --utility-bar-background: var(--palette-lilac);
            --app-header-background-color: var(--palette-lilac);

            display: block;
            width: 100%;
            height: 100%;
            max-height: 100vh;
            min-height: 0;
            overflow: hidden;
        }

        .app {
            height: 100%;
            width: 100%;
            display: grid;
            grid-template-columns: 260px 1fr;
            background: var(--fb-bg);
            color: var(--fb-text);
            min-height: 0;
            overflow: hidden;
        }

        .sidebar {
            background: var(--fb-surface-2);
            border-right: 1px solid var(--fb-grid);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-height: 0;
        }

        .brand {
            font-weight: 700;
            font-size: 17px;
            padding: 8px 10px;
            border-radius: 12px;
            background: var(--fb-accent);
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 6px;
        }

        .navbtn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            width: 100%;
            border: 0;
            background: transparent;
            padding: 12px 14px;
            border-radius: 14px;
            cursor: pointer;
            text-align: left;
            color: var(--fb-text);
            font-size: 15px;
        }

        .navbtn:hover {
            background: var(--fb-surface);
        }

        .navbtn.active {
            background: var(--fb-accent);
        }

        .navmeta {
            font-size: 12px;
            color: var(--fb-muted);
        }

        .main {
            display: grid;
            grid-template-rows: auto 1fr;
            min-width: 0;
            min-height: 0;
        }

        .topbar {
            background: var(--fb-bg);
            border-bottom: 0;
            padding: 10px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .toprow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .title {
            font-size: 19px;
            font-weight: 800;
        }

        .subtabs {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .pill {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            padding: 7px 12px;
            border-radius: 999px;
            cursor: pointer;
            font-size: 13px;
        }

        .pill.active {
            background: var(--fb-accent);
            border-color: transparent;
        }

        .summaryRow {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .summaryBadge {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 8px 12px;
            background: var(--fb-surface-3);
            font-size: 13px;
            min-height: 40px;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            display: inline-block;
        }

        .content {
            position: relative;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
            background: var(--fb-bg);
        }

        .fab {
            position: absolute;
            right: 18px;
            bottom: 18px;
            width: 56px;
            height: 56px;
            border-radius: 999px;
            border: 0;
            cursor: pointer;
            background: var(--fb-accent);
            color: var(--fb-print-text);
            font-size: 26px;
            line-height: 0;
            box-shadow: var(--fb-shadow);
        }

        .fab:active {
            transform: translateY(1px);
        }

        @media (max-width: 900px) {
            .app {
                grid-template-columns: 1fr;
            }
            .sidebar {
                display: none;
            }
            .topbar {
                padding: 10px;
            }
        }
    `;
}
