import { Page, test } from "@playwright/test"
import { chat } from "./shared/chat"
import { faker } from "@faker-js/faker"
import { modelName } from "@repo/db/src/schema"
import { subscribe } from "./shared/subscribe"
import { getURL } from "."
import { thread } from "./shared/thread"
import { collaboration } from "./shared/collaboration"
import { text } from "stream/consumers"
const isMember = false

// test("Subscribe", async ({ page }) => {
//   await page.goto(getURL(), {
//     waitUntil: "networkidle",
//   })
//   await subscribe({ page })
// })

// test("Thread", async ({ page }) => {
//   await thread({ page })
// })

// test("Collaboration", async ({ page, browser }) => {
//   await collaboration({ page, browser })
// })

test.skip("Chat", async ({ page }) => {
  test.slow()
  await chat({
    isLiveTest: true,
    isNewChat: true,
    page,
    isMember,
    agentMessageTimeout: 120000,
    instruction: "Help me plan a 3-day trip to Tokyo",
    prompts: [
      {
        text: "What are the must-see attractions in Tokyo?",
        model: "deepSeek",
      },
      {
        text: "Can you suggest a detailed itinerary for day 1?",
        model: "deepSeek",
        like: true,
      },
      {
        text: "What's the best way to get around between these places?",
        model: "deepSeek",
        like: true,
      },
      {
        text: "Should not select this agent should continue with deepSeek",
        model: "claude",
      },
    ],
  })

  await chat({
    isNewChat: true,
    isLiveTest: true,
    page,
    agentMessageTimeout: 120000,
    isMember,
    instruction: "Generate creative images for my travel blog",
    prompts: [
      {
        text: "Create a futuristic cityscape at sunset with flying cars, 4K, hyperrealistic",
        model: "flux",
        like: true,
      },
    ],
  })
})
