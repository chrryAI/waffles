import * as dotenv from "dotenv"
import { Page } from "@playwright/test"

export const TEST_GUEST_FINGERPRINTS = ["EDIT"]
export const TEST_MEMBER_FINGERPRINTS = ["EDIT"]
export const TEST_MEMBER_EMAILS = ["EDIT"]

export const VEX_TEST_EMAIL = process.env.VEX_TEST_EMAIL_1!
export const VEX_TEST_PASSWORD = process.env.VEX_TEST_PASSWORD_1!
export const VEX_TEST_FINGERPRINT = TEST_MEMBER_FINGERPRINTS[0]
export const VEX_TEST_EMAIL_2 = process.env.VEX_TEST_EMAIL_2!
export const VEX_TEST_PASSWORD_2 = process.env.VEX_TEST_PASSWORD_2!
export const VEX_TEST_FINGERPRINT_2 = TEST_MEMBER_FINGERPRINTS[1]
export const VEX_TEST_EMAIL_3 = process.env.VEX_TEST_EMAIL_3!
export const VEX_TEST_PASSWORD_3 = process.env.VEX_TEST_PASSWORD_3!
export const VEX_TEST_FINGERPRINT_3 = TEST_MEMBER_FINGERPRINTS[2]

dotenv.config()

export const TEST_URL = process.env.TEST_URL!
export const LIVE_URL = "https://chrry.ai"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
export const isCI = process.env.NEXT_PUBLIC_CI || process.env.CI

const getURL = (
  {
    isLive = false,
    isMember = false,
    path = "",
    fingerprint = "",
  }: {
    isLive: boolean
    isMember?: boolean
    path?: string
    fingerprint?: string
  } = {
    isLive: false,
    isMember: false,
    path: "",
    fingerprint: "",
  },
) => {
  const base = isLive ? LIVE_URL : TEST_URL
  return isMember
    ? `${base}${path}?fp=${fingerprint || TEST_MEMBER_FINGERPRINTS[0]}`
    : `${base}${path}?fp=${fingerprint || TEST_GUEST_FINGERPRINTS[0]}`
}

const simulateInputPaste = async (page: Page, text: string) => {
  await page.evaluate((content) => {
    const textarea = document.querySelector(
      'textarea[data-testid="chat-textarea"]',
    ) as HTMLTextAreaElement
    if (!textarea) return

    // Create a basic event
    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    })

    // Add clipboardData getter
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        getData: () => content,
        types: ["text/plain"],
        files: [],
        items: [
          {
            kind: "string",
            type: "text/plain",
            getAsString: (callback: (text: string) => void) =>
              callback(content),
          },
        ],
      },
      writable: false,
    })

    // Dispatch the event
    textarea.dispatchEvent(pasteEvent)

    // Set the value directly after the paste event
    textarea.value = content

    // Trigger input event to simulate actual typing
    const inputEvent = new Event("input", { bubbles: true })
    textarea.dispatchEvent(inputEvent)
  }, text)
}
const simulatePaste = async (page: Page, text: string) => {
  // Use Playwright's built-in clipboard API
  await page.evaluate(async (content) => {
    // Write to clipboard
    await navigator.clipboard.writeText(content)

    // Find the paste button and click it
    const pasteButton = document.querySelector(
      '[data-testid*="artifacts-paste-button"]',
    ) as HTMLButtonElement
    if (pasteButton) {
      pasteButton.click()
    }
  }, text)
}

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1)
}

export {
  wait,
  getURL,
  simulateInputPaste,
  simulatePaste,
  capitalizeFirstLetter,
}
