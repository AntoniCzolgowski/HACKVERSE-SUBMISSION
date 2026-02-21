// lib/mock-data.ts
// Realistic mock data for frontend development before backend is ready

import { DiscoverResponse } from "./types";

export function mockDiscoverResponse(productName: string): DiscoverResponse {
  return {
    request_id: "mock-" + Date.now(),
    product_name: productName,
    enhanced_queries: [
      `${productName} app reddit`,
      "fitness dating community",
      "gym singles meetup",
      "workout partner dating app",
    ],
    subreddits: [
      {
        name: "r/fitness",
        display_name: "Fitness",
        relevance_score: 0.91,
        reasoning: [
          "High keyword overlap with gym/fitness terminology",
          "1.2M+ active users frequently discuss gym culture and social dynamics",
          "Multiple threads about meeting people at the gym indicate audience fit",
        ],
        subscribers: 1200000,
        active_users: 4500,
        rules_summary: [
          "No self-promotion outside weekly thread",
          "Flair required on all posts",
          "No link-only posts",
        ],
        community_tone: "supportive, advice-oriented, casual",
        recent_topics: ["workout splits", "gym etiquette", "progress pics", "gym anxiety"],
        post_drafts: [
          {
            type: "organic_user",
            label: "Organic User Post",
            title: "Anyone else wish there was a better way to meet people who are into fitness?",
            body: "I've been going to my local gym for about 2 years now, and I've noticed that while I see the same people every day, there's no good way to actually connect with them outside the gym. Dating apps don't really let you filter for fitness lifestyle, and approaching people mid-workout feels awkward.\n\nRecently I stumbled across this new app that's specifically designed for gym-goers to connect. Has anyone else tried niche dating apps like this? I'm curious if the smaller user base actually leads to better matches since everyone already shares a common interest.",
            strategy: "Frames product discovery as a genuine personal experience, inviting community discussion",
          },
          {
            type: "company_professional",
            label: "Professional Post",
            title: `[App Launch] ${productName} \u2014 A dating app built specifically for the fitness community`,
            body: `Hey r/fitness! We're a small team of gym enthusiasts who got tired of mainstream dating apps not understanding the fitness lifestyle. So we built ${productName}.\n\nThe idea is simple: connect people who prioritize health and fitness in their daily lives. You can filter by workout style, gym location, fitness goals, and more.\n\nWe'd love feedback from this community since you're exactly the people we built this for. What features would matter most to you in a fitness-focused dating app?\n\nHappy to answer any questions. And yes, we lift. \ud83d\udcaa`,
            strategy: "Transparent brand introduction with community engagement and feedback request",
          },
          {
            type: "subtle_engagement",
            label: "Subtle Engagement",
            title: "How do you actually meet people who share your fitness lifestyle?",
            body: "Serious question \u2014 I feel like fitness is such a core part of my identity, but it's surprisingly hard to find a partner who genuinely shares that. Regular dating apps don't really account for lifestyle compatibility beyond surface-level interests.\n\nFor those of you in relationships, how did you meet your partner? Did fitness play a role? And for those still looking, what's been your experience trying to find someone who actually gets the gym life?\n\nI'm curious because it seems like there's a real gap here that nobody's really solving well.",
            strategy: "Discussion question that surfaces the exact problem the product solves, without any mention of the product",
          },
        ],
      },
      {
        name: "r/dating_advice",
        display_name: "Dating Advice",
        relevance_score: 0.85,
        reasoning: [
          "Direct overlap with dating app audience",
          "Frequent discussions about niche dating preferences",
          "Users actively seek and discuss new dating platforms",
        ],
        subscribers: 890000,
        active_users: 3200,
        rules_summary: [
          "No advertising or self-promotion",
          "Posts must be asking for or giving advice",
          "Be respectful and constructive",
        ],
        community_tone: "empathetic, advice-driven, supportive but direct",
        recent_topics: ["first date tips", "app fatigue", "niche dating", "red flags"],
        post_drafts: [
          {
            type: "organic_user",
            label: "Organic User Post",
            title: "Has anyone tried niche dating apps? I'm tired of the mainstream ones",
            body: "I've been on Tinder, Hinge, and Bumble for over a year and I'm honestly burnt out. The matches are so random \u2014 I'll match with someone who looks great on paper but we have nothing in common lifestyle-wise.\n\nI'm really into fitness (gym 5-6x a week) and it's a dealbreaker if my partner doesn't at least appreciate that. Recently found a dating app that's specifically for fitness people and honestly the concept makes so much more sense to me.\n\nHas anyone else had better luck with niche apps vs. the big ones?",
            strategy: "Authentic frustration narrative that naturally introduces the concept of niche dating",
          },
          {
            type: "company_professional",
            label: "Professional Post",
            title: "We built a dating app for fitness enthusiasts \u2014 looking for honest feedback",
            body: `Hi r/dating_advice! Full transparency: we built ${productName}, a dating app focused on the fitness community. Before you scroll past \u2014 we're genuinely here for feedback, not just promotion.\n\nThe core insight was simple: lifestyle compatibility matters more than most dating apps account for. If fitness is central to your life, shouldn't your dating app understand that?\n\nWe'd love to hear: What would make you trust a new, smaller dating app? What's missing from the big platforms that a niche app could solve?`,
            strategy: "Honest, transparent approach requesting genuine community feedback",
          },
          {
            type: "subtle_engagement",
            label: "Subtle Engagement",
            title: "Do you think lifestyle compatibility is more important than most dating apps make it?",
            body: "I've been thinking about this a lot lately. Most dating apps let you filter by age, distance, maybe height \u2014 but the things that actually determine day-to-day compatibility (fitness habits, diet, sleep schedule, social energy) are barely represented.\n\nLike, if I go to the gym at 5 AM every day and meal prep on Sundays, dating someone who stays up until 3 AM and eats out every meal is going to be a constant friction point.\n\nDoes anyone else feel like there's a huge gap between what dating apps filter for and what actually matters for relationship compatibility?",
            strategy: "Thought-provoking discussion about the gap in current dating apps, perfectly positioning the product's value prop",
          },
        ],
      },
      {
        name: "r/GymMotivation",
        display_name: "Gym Motivation",
        relevance_score: 0.79,
        reasoning: [
          "Highly engaged fitness community with social discussion",
          "Users frequently discuss gym social dynamics",
          "Positive, encouraging tone matches brand voice",
        ],
        subscribers: 340000,
        active_users: 1200,
        rules_summary: ["Keep it positive", "No spam", "Tag transformation posts"],
        community_tone: "enthusiastic, motivational, social",
        recent_topics: ["gym transformations", "workout playlists", "gym buddy", "motivation tips"],
        post_drafts: [
          {
            type: "organic_user",
            label: "Organic User Post",
            title: "My gym buddy turned into my girlfriend \u2014 here's what I learned about fitness dating",
            body: "This might be a different kind of motivation post, but I think it fits. Six months ago I started working out with a girl I met through a fitness dating app. What started as spotting each other turned into meal prepping together, then actual dates.\n\nThe point is: having a partner who shares your fitness goals is an insane multiplier. We push each other, eat clean together, and never have the \"why do you spend so much time at the gym\" argument.\n\nAnyone else found their gym partner through unexpected channels?",
            strategy: "Success story narrative that organically features the product concept",
          },
          {
            type: "company_professional",
            label: "Professional Post",
            title: `${productName} \u2014 Find someone who matches your energy (literally)`,
            body: `Hey gym fam! We made ${productName} because we believe the best relationships start with shared lifestyle. When you both understand the grind, everything else gets easier.\n\nWe match people based on workout style, gym schedule, fitness goals, and more. No more explaining why you can't skip leg day for brunch.\n\nWho else thinks the fitness community deserves its own dating space? \ud83d\udcaa`,
            strategy: "Community-aligned brand voice with enthusiasm matching the subreddit tone",
          },
          {
            type: "subtle_engagement",
            label: "Subtle Engagement",
            title: "Real talk: has the gym helped your dating life or hurt it?",
            body: "Genuinely curious about this. On one hand, being fit probably helps with initial attraction. But on the other hand, the gym lifestyle can be a dealbreaker for people who don't get it.\n\nEarly mornings, strict diet, spending 1-2 hours at the gym daily \u2014 not everyone is cool with that in a partner.\n\nHow have you navigated this? Did you find a partner who gets it, or are you still looking for someone who matches your gym energy?",
            strategy: "Relatable discussion that highlights the exact pain point without any product mention",
          },
        ],
      },
      {
        name: "r/OnlineDating",
        display_name: "Online Dating",
        relevance_score: 0.76,
        reasoning: [
          "Users actively discuss and review dating platforms",
          "Openness to new app recommendations",
          "Frequent posts about app fatigue and niche alternatives",
        ],
        subscribers: 210000,
        active_users: 890,
        rules_summary: ["No personal ads", "No direct app promotion without context", "Be respectful"],
        community_tone: "candid, slightly cynical, review-oriented",
        recent_topics: ["app reviews", "profile tips", "dating burnout", "niche apps"],
        post_drafts: [
          {
            type: "organic_user",
            label: "Organic User Post",
            title: "Tried a fitness-specific dating app and honestly the experience is completely different",
            body: "After years of Tinder/Hinge burnout, I decided to try a niche dating app focused on fitness. The difference is night and day.\n\nSmaller user base, sure. But literally every match understands my lifestyle. No more explaining why I wake up at 5 AM or why I bring tupperware to restaurants.\n\nFirst dates are gym sessions instead of awkward coffee meetups. It just works.\n\nAnyone else had success with niche dating apps? I feel like the big apps are losing the plot.",
            strategy: "Review-style post framed as personal experience, matching the subreddit's review culture",
          },
          {
            type: "company_professional",
            label: "Professional Post",
            title: "We built a niche dating app for the fitness community \u2014 honest review request",
            body: `This community gives the most honest app reviews I've seen, so I'm putting ${productName} in front of you.\n\nWe built it for people who are serious about fitness and want a partner who gets that. The filters go deep: workout style, gym frequency, fitness goals, diet preferences.\n\nI know this sub has seen a lot of app launches. What would actually make you try a new platform at this point?`,
            strategy: "Leverages the subreddit's review culture to invite genuine, critical feedback",
          },
          {
            type: "subtle_engagement",
            label: "Subtle Engagement",
            title: "Why don't major dating apps let you filter by lifestyle?",
            body: "This has been bugging me. You can filter by height, age, distance, education \u2014 but you can't filter by things that actually affect daily life together.\n\nFitness level, diet preferences, sleep schedule, social energy \u2014 these are the things that cause friction in relationships, but no major app addresses them.\n\nIs this a technology problem, a design choice, or do most people just not care about lifestyle compatibility?",
            strategy: "Critical discussion about dating app design gaps, naturally highlighting the market opportunity",
          },
        ],
      },
      {
        name: "r/datingoverthirty",
        display_name: "Dating Over Thirty",
        relevance_score: 0.72,
        reasoning: [
          "Mature audience seeking intentional dating",
          "Values lifestyle compatibility over surface attraction",
          "Discussions about what actually matters in long-term partners",
        ],
        subscribers: 520000,
        active_users: 2100,
        rules_summary: ["Must be 30+ to post", "No spam", "Thoughtful discussion only"],
        community_tone: "mature, reflective, pragmatic",
        recent_topics: ["dealbreakers", "lifestyle compatibility", "app fatigue", "intentional dating"],
        post_drafts: [
          {
            type: "organic_user",
            label: "Organic User Post",
            title: "At 33, I've realized lifestyle compatibility matters more than chemistry. Anyone else?",
            body: "After a string of relationships that fizzled because of fundamental lifestyle differences, I've changed my approach completely. I need someone who understands why I'm at the gym at 6 AM, why I meal prep, and why I go to bed by 10.\n\nRecently started using a dating app that actually filters for this stuff and it's been a game changer. The matches are fewer but SO much more compatible.\n\nFor those over 30: has your criteria shifted from attraction-first to lifestyle-first?",
            strategy: "Age-appropriate reflection that resonates with the sub's mature perspective",
          },
          {
            type: "company_professional",
            label: "Professional Post",
            title: `Built a dating app around lifestyle compatibility \u2014 need perspective from 30+ crowd`,
            body: `Hi DOT! We built ${productName} with the insight that lifestyle compatibility predicts relationship success better than surface-level attraction.\n\nFor the fitness community specifically \u2014 matching on workout habits, diet, schedule, and goals.\n\nAs the most pragmatic dating community on Reddit: what would actually convince you to try yet another dating app? What's the one feature that would make you stay?`,
            strategy: "Respects the community's maturity and asks for their unique perspective",
          },
          {
            type: "subtle_engagement",
            label: "Subtle Engagement",
            title: "What 'lifestyle compatibility' factors do you wish dating apps actually measured?",
            body: "We all know the basics: age, location, maybe height preferences. But as I've gotten older, I've realized the things that make or break a relationship are the everyday habits.\n\nSleep schedule compatibility. How someone spends their weekends. Their relationship with fitness and health. How they handle stress.\n\nWhat factors do you wish dating apps would actually let you filter or match on? Curious what this community values most.",
            strategy: "Open discussion that surfaces lifestyle matching as a concept, directly in the product's problem space",
          },
        ],
      },
    ],
  };
}
