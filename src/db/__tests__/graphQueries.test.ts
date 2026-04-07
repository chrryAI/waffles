/**
 * Graph Queries Unit Tests
 *
 * Tests for FalkorDB graph query helpers
 * All queries gracefully degrade when FalkorDB is unavailable
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock the graph client
vi.mock("../src/graph/client", () => ({
  graph: {
    query: vi.fn(),
  },
  isGraphAvailable: true,
}))

import { graph, isGraphAvailable } from "../src/graph/client"
import {
  getAppsInStore,
  getCharacterProfilesForApp,
  getCharacterProfilesForUser,
  getFalkorHealthSummary,
  getMemoriesForApp,
  getMemoriesForUser,
  getRelatedApps,
  getThreadGraphForUser,
  searchMemoriesByTag,
} from "../src/graph/queries"

describe("graph/queries", () => {
  const mockGraph = graph as unknown as { query: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Memories
  // ===========================================================================

  describe("getMemoriesForUser", () => {
    it("should return empty array when graph is unavailable", async () => {
      vi.mocked(isGraphAvailable as unknown as boolean, true).value = false

      const result = await getMemoriesForUser("user-1")

      expect(result).toEqual([])
    })

    it("should return memories for user", async () => {
      const mockData = [
        {
          id: "mem-1",
          title: "Memory 1",
          content: "Content 1",
          category: "preference",
          importance: 0.9,
          tags: '["tag1", "tag2"]',
        },
        {
          id: "mem-2",
          title: "Memory 2",
          content: "Content 2",
          category: "fact",
          importance: 0.7,
          tags: '["tag3"]',
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getMemoriesForUser("user-1")

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe("mem-1")
      expect(result[0].tags).toEqual(["tag1", "tag2"])
      expect(result[1].tags).toEqual(["tag3"])
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (m:Memory)-[:BELONGS_TO]->(u:User {id: $userId})",
        ),
        { params: { userId: "user-1", limit: 50 } },
      )
    })

    it("should use custom limit", async () => {
      mockGraph.query.mockResolvedValueOnce({ data: [] })

      await getMemoriesForUser("user-1", 10)

      expect(mockGraph.query).toHaveBeenCalledWith(expect.any(String), {
        params: { userId: "user-1", limit: 10 },
      })
    })

    it("should handle parse errors gracefully", async () => {
      const mockData = [
        {
          id: "mem-1",
          title: "Memory 1",
          content: "Content 1",
          category: "preference",
          importance: 0.9,
          tags: "invalid-json",
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getMemoriesForUser("user-1")

      expect(result[0].tags).toEqual([]) // fallback for invalid JSON
    })

    it("should return empty array on query error", async () => {
      mockGraph.query.mockRejectedValueOnce(new Error("DB error"))

      const result = await getMemoriesForUser("user-1")

      expect(result).toEqual([])
    })
  })

  describe("searchMemoriesByTag", () => {
    it("should search memories by tag", async () => {
      const mockData = [
        {
          id: "mem-1",
          title: "Memory 1",
          content: "Content 1",
          category: "preference",
          importance: 0.9,
          tags: '["important"]',
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await searchMemoriesByTag("user-1", "important")

      expect(result).toHaveLength(1)
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE $tag IN m.tags"),
        { params: { userId: "user-1", tag: "important" } },
      )
    })

    it("should return empty array on error", async () => {
      mockGraph.query.mockRejectedValueOnce(new Error("DB error"))

      const result = await searchMemoriesByTag("user-1", "tag")

      expect(result).toEqual([])
    })
  })

  describe("getMemoriesForApp", () => {
    it("should return memories for specific app", async () => {
      const mockData = [
        {
          id: "mem-1",
          title: "App Memory",
          content: "Content",
          category: "context",
          importance: 0.8,
          tags: "[]",
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getMemoriesForApp("user-1", "app-1")

      expect(result).toHaveLength(1)
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining("MATCH (m)-[:ABOUT]->(a:App {id: $appId})"),
        { params: { userId: "user-1", appId: "app-1" } },
      )
    })
  })

  // ===========================================================================
  // Character Profiles
  // ===========================================================================

  describe("getCharacterProfilesForApp", () => {
    it("should return character profiles for app", async () => {
      const mockData = [
        {
          id: "char-1",
          name: "Helpful Assistant",
          personality: "Friendly and supportive",
          userRelationship: "helper",
          tags: '["friendly", "supportive"]',
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getCharacterProfilesForApp("app-1")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Helpful Assistant")
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (c:CharacterProfile)-[:PERSONA_OF]->(a:App {id: $appId})",
        ),
        { params: { appId: "app-1" } },
      )
    })
  })

  describe("getCharacterProfilesForUser", () => {
    it("should return character profiles for user", async () => {
      const mockData = [
        {
          id: "char-1",
          name: "Personal Assistant",
          personality: "Knows user well",
          userRelationship: "companion",
          tags: "[]",
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getCharacterProfilesForUser("user-1")

      expect(result).toHaveLength(1)
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (c:CharacterProfile)-[:KNOWS]->(u:User {id: $userId})",
        ),
        { params: { userId: "user-1" } },
      )
    })
  })

  // ===========================================================================
  // Threads
  // ===========================================================================

  describe("getThreadGraphForUser", () => {
    it("should return threads for user", async () => {
      const mockData = [
        {
          id: "thread-1",
          title: "Test Thread",
          createdOn: "2024-01-01T00:00:00Z",
          appSlug: "test-app",
          appName: "Test App",
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getThreadGraphForUser("user-1")

      expect(result).toHaveLength(1)
      expect(result[0].appSlug).toBe("test-app")
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (t:Thread)-[:OWNED_BY]->(u:User {id: $userId})",
        ),
        { params: { userId: "user-1", limit: 100 } },
      )
    })
  })

  // ===========================================================================
  // Spatial Navigation (Apps)
  // ===========================================================================

  describe("getRelatedApps", () => {
    it("should return related apps by spatial traversal", async () => {
      const mockData = [
        {
          id: "app-2",
          slug: "related-1",
          name: "Related 1",
          icon: "icon1",
          depth: 1,
        },
        {
          id: "app-3",
          slug: "related-2",
          name: "Related 2",
          icon: "icon2",
          depth: 2,
        },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getRelatedApps("app-1", 2)

      expect(result).toHaveLength(2)
      expect(result[0].depth).toBe(1)
      expect(result[1].depth).toBe(2)
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH path = (origin:App {id: $appId})-[:BELONGS_TO|EXTENDS*1..$depth]-(related:App)",
        ),
        { params: { appId: "app-1", depth: 2 } },
      )
    })

    it("should use default depth of 2", async () => {
      mockGraph.query.mockResolvedValueOnce({ data: [] })

      await getRelatedApps("app-1")

      expect(mockGraph.query).toHaveBeenCalledWith(expect.any(String), {
        params: { appId: "app-1", depth: 2 },
      })
    })

    it("should limit to 20 results", async () => {
      mockGraph.query.mockResolvedValueOnce({ data: [] })

      await getRelatedApps("app-1")

      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT 20"),
        expect.any(Object),
      )
    })
  })

  describe("getAppsInStore", () => {
    it("should return apps in store", async () => {
      const mockData = [
        { id: "app-1", slug: "app-1", name: "App 1", icon: "icon1", depth: 1 },
        { id: "app-2", slug: "app-2", name: "App 2", icon: "icon2", depth: 1 },
      ]

      mockGraph.query.mockResolvedValueOnce({ data: mockData })

      const result = await getAppsInStore("store-1")

      expect(result).toHaveLength(2)
      expect(mockGraph.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "MATCH (a:App)-[:BELONGS_TO]->(s:Store {id: $storeId})",
        ),
        { params: { storeId: "store-1" } },
      )
    })
  })

  // ===========================================================================
  // Diagnostics
  // ===========================================================================

  describe("getFalkorHealthSummary", () => {
    it("should return node counts per label", async () => {
      mockGraph.query
        .mockResolvedValueOnce({ data: [{ c: 10 }] }) // Store
        .mockResolvedValueOnce({ data: [{ c: 50 }] }) // App
        .mockResolvedValueOnce({ data: [{ c: 100 }] }) // Memory
        .mockResolvedValueOnce({ data: [{ c: 20 }] }) // CharacterProfile
        .mockResolvedValueOnce({ data: [{ c: 200 }] }) // Thread
        .mockResolvedValueOnce({ data: [{ c: 30 }] }) // User

      const result = await getFalkorHealthSummary()

      expect(result).toEqual({
        Store: 10,
        App: 50,
        Memory: 100,
        CharacterProfile: 20,
        Thread: 200,
        User: 30,
      })
    })

    it("should return -1 for labels with errors", async () => {
      mockGraph.query
        .mockResolvedValueOnce({ data: [{ c: 10 }] }) // Store
        .mockRejectedValueOnce(new Error("DB error")) // App fails
        .mockResolvedValueOnce({ data: [{ c: 100 }] }) // Memory
        .mockResolvedValueOnce({ data: [{ c: 20 }] }) // CharacterProfile
        .mockResolvedValueOnce({ data: [{ c: 200 }] }) // Thread
        .mockResolvedValueOnce({ data: [{ c: 30 }] }) // User

      const result = await getFalkorHealthSummary()

      expect(result.App).toBe(-1)
      expect(result.Memory).toBe(100)
    })

    it("should return empty object when graph unavailable", async () => {
      vi.mocked(isGraphAvailable as unknown as boolean, true).value = false

      const result = await getFalkorHealthSummary()

      expect(result).toEqual({})
    })
  })
})
