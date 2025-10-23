import { expect, Page, test } from "@playwright/test"
import { wait } from "./utils"

export const signIn = async ({
  page,
  isOpened = false,
  signOut = false,
  register = false,
  email = process.env.VEX_TEST_EMAIL_2!,
  password = process.env.VEX_TEST_PASSWORD_2!,
}: {
  page: Page
  isOpened?: boolean
  signOut?: boolean
  register?: boolean
  email?: string
  password?: string
}) => {
  const signInButton = page.getByTestId("login-button")

  if (!isOpened) {
    await expect(signInButton).toBeVisible({
      timeout: 15000,
    })
    await signInButton.click()
  }

  const isExtension = page.url().includes("extension")

  const modal = page.getByTestId("sign-in-modal")
  await expect(modal).toBeVisible()

  const emailInput = page.getByTestId("sign-in-email")
  await expect(emailInput).toBeVisible()

  await emailInput.fill(email)

  const passwordInput = page.getByTestId("sign-in-password")
  await expect(passwordInput).toBeVisible()

  await passwordInput.fill(password)

  await wait(2000)

  const signInSubmit = page.getByTestId("login-submit")
  await expect(signInSubmit).toBeVisible()

  await signInSubmit.click({
    force: true,
  })

  if (!!process.env.CI) {
    // Wait for the redirect URL attribute to be set
    await page.waitForFunction(
      () => {
        const submitButton = document.querySelector(
          '[data-testid="login-submit"]',
        )
        return submitButton && submitButton.hasAttribute("data-redirect-url")
      },
      { timeout: 15000 },
    )

    const redirectUrl = await signInSubmit.getAttribute("data-redirect-url")

    if (!redirectUrl) {
      throw new Error("Redirect URL not found")
    }
    await page.goto(redirectUrl)
  }

  await wait(4000)

  await expect(signInButton).not.toBeVisible()

  const accountButton = page.getByTestId("account-button")
  await expect(accountButton).toBeVisible()

  if (signOut) {
    await accountButton.click()

    const email = page.getByTestId("account-email")
    await expect(email).toBeVisible()

    const logoutButton = page.getByTestId("account-logout-button")
    await expect(logoutButton).toBeVisible()

    await logoutButton.click()

    await expect(signInButton).toBeVisible({
      timeout: 15000,
    })
  }
}
