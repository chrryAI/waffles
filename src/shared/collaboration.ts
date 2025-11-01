import { Browser, expect, test } from "@playwright/test"
import { getURL, wait } from ".."
import { chat } from "./chat"
import { Page } from "@playwright/test"
import { signIn } from "./signIn"

export async function collaboration({
  page,
  isLive = false,
  isMember = false,
  browser,
  withShareLink = true,
  fingerprint,
  collaborate = "feedbackwallet@gmail.com",
}: {
  page: Page
  isLive?: boolean
  isMember?: boolean
  browser: Browser
  withShareLink?: boolean
  collaborate?: string
  fingerprint?: string
}) {
  const TEST_URL = getURL({
    fingerprint,
    isLive,
    isMember,
  })

  const getMemberUrl = (path?: string) =>
    getURL({
      isLive,
      isMember: true,
      path,
    })

  // Create two separate browser contexts (simulating two different users)
  const context1 = await browser.newContext()

  const page1 = page

  // User 1: Create a new thread and get the thread ID
  await page1.goto(TEST_URL, { waitUntil: "networkidle" })

  // Send first message to create thread

  await chat({
    bookmark: false,
    page: page1,
    isNewChat: false,
    isMember,
    instruction: "Let's plan a trip together",
    prompts: [
      {
        text: "I want to visit Japan. What should I know?",
        model: "deepSeek",
      },
    ],
  })

  // Get the thread ID from URL
  await page1.waitForTimeout(2000) // Wait for navigation
  const threadUrl = page1.url()
  const threadId = threadUrl.split("/threads/")[1]?.split("?")[0]

  expect(threadId).toBeTruthy()
  console.log("Thread:", threadId)

  // User 1: Share the thread (make it public or get collaboration link)
  const threadShareButton = page1.getByTestId("thread-share-button")
  expect(threadShareButton).toBeVisible()
  // User 1: Share the thread (make it public or get collaboration link)
  const chatShareButton = page1.getByTestId("chat-share-button")
  await chatShareButton.click()
  await wait(1000)

  const chatCollaborateButton = page1.getByTestId("chat-collaborate-button")
  expect(chatCollaborateButton).toBeVisible()
  await chatCollaborateButton.click()
  await wait(1000)

  const shareInput = page1.getByTestId("chat-share-input")
  await expect(shareInput).toHaveValue(threadUrl)
  const shareCopyButton = page1.getByTestId("chat-share-copy-button")
  expect(shareCopyButton).toBeVisible()
  await shareCopyButton.click()
  await wait(1000)

  const collaborateInput = page1.getByTestId("chat-collaborate-input")
  expect(collaborateInput).toBeVisible()

  await collaborateInput.fill("iliyan@chrry.ai")

  const collaborateAddButton = page1.getByTestId("chat-collaborate-add-button")
  await collaborateAddButton.click()

  const collaborateName = page1.getByTestId("chat-collaborator-name")
  await expect(collaborateName).toBeVisible({
    timeout: 8000,
  })

  const collaborateEmail = page1.getByTestId("chat-collaborator-email")
  await expect(collaborateEmail).toBeVisible()

  const collaborateStatus = page1.getByTestId("chat-collaborator-status")
  await expect(collaborateStatus).toHaveText("pending")

  const collaboratorRevokeButton = page1.getByTestId(
    "chat-collaborator-revoke-button",
  )

  await expect(collaboratorRevokeButton).toBeVisible()
  await collaboratorRevokeButton.click()
  await wait(1000)
  await collaboratorRevokeButton.click()
  await wait(1000)
  await expect(collaborateName).not.toBeVisible({
    timeout: 8000,
  })
  await expect(collaborateEmail).not.toBeVisible()

  await collaborateInput.fill(collaborate)

  await collaborateAddButton.click()
  await expect(collaborateName).toBeVisible({
    timeout: 8000,
  })
  await expect(collaborateEmail).toBeVisible()
  await expect(collaborateStatus).toHaveText("pending")

  await page1.getByTestId("chat-share-modal-close-button").click()
  await wait(1000)
  const chatInput1 = page1.getByTestId("chat-textarea")

  const context2 = await browser.newContext()
  const page2 = await context2.newPage()

  await page2.goto(getMemberUrl(), {
    waitUntil: "networkidle",
  })

  await signIn({ page: page2 })

  // User 2: Join the same thread
  await page2.goto(
    withShareLink ? `${getMemberUrl(`/threads/${threadId}`)}` : getMemberUrl(),
    {
      waitUntil: "networkidle",
    },
  )

  // Verify both users can see the thread
  const chatInput2 = page2.getByTestId("chat-textarea")
  // User 2: Send a message
  await expect(chatInput2).toBeDisabled()

  const acceptCollaborationButton = page2.getByTestId(
    "chat-accept-collaboration",
  )

  expect(acceptCollaborationButton).toBeVisible()

  const rejectCollaborationButton = page2.getByTestId(
    "chat-reject-collaboration",
  )

  expect(rejectCollaborationButton).toBeVisible()

  await acceptCollaborationButton.click()

  await expect(chatInput2).toBeEnabled({
    timeout: 8000,
  })

  await chat({
    page: page2,
    isNewChat: false,
    threadId: threadId,
    isMember: true, // Member user (signed in)
    prompts: [
      {
        text: "I've been to Tokyo before! The cherry blossoms are amazing in spring.",
        model: "deepSeek",
      },
    ],
  })

  await page1.bringToFront()

  // User 1: Verify they can see User 2's message
  await page1.waitForTimeout(3000) // Wait for real-time sync
  const messages1 = page1.getByTestId("message")
  const count1 = await messages1.count()
  expect(count1).toBeGreaterThanOrEqual(3) // Original + AI response + User 2's message

  // User 1: Send another message
  await chat({
    page: page1,
    isNewChat: false,
    threadId: threadId,
    isMember,
    creditsConsumed: 1,
    prompts: [
      {
        text: "That's great! When is the best time to see cherry blossoms?",
        model: "deepSeek",
      },
    ],
  })

  await page2.bringToFront()
  // User 2: Verify they can see User 1's new message
  await page2.waitForTimeout(3000) // Wait for real-time sync
  const messages2 = page2.getByTestId("message")
  const count2 = await messages2.count()
  expect(count2).toBeGreaterThanOrEqual(5) // All previous + User 1's new message

  // Test typing indicators (if implemented)

  await page1.bringToFront()

  // User 1 starts typing
  await chatInput1.click()
  await chatInput1.fill("I'm typing...")

  // User 2 should see typing indicator
  await page2.bringToFront()
  await page2.waitForTimeout(2000)

  expect(
    await page2.getByTestId("typing-indicator").count(),
  ).toBeGreaterThanOrEqual(1)

  await page2.waitForTimeout(5000)
  expect(await page2.getByTestId("typing-indicator").count()).toBe(0)

  await chatInput2.click()
  await chatInput2.fill("I'm typing too...")

  await page1.bringToFront()
  await page1.waitForTimeout(2000)
  expect(
    await page1.getByTestId("typing-indicator").count(),
  ).toBeGreaterThanOrEqual(1)
  await page1.waitForTimeout(3000)
  expect(await page1.getByTestId("typing-indicator").count()).toBe(0)
  // Clean up
  await context1.close()
  await context2.close()
}
