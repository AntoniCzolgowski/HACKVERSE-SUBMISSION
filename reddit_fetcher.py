import requests
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
from pathlib import Path

from app.models import RedditPost, Comment


class RedditFetcher:
    """
    Fetches Reddit posts using public JSON endpoints (no API key required).

    Reddit's public JSON endpoints:
    - https://www.reddit.com/r/{subreddit}/new.json
    - https://www.reddit.com/r/{subreddit}/hot.json
    - https://www.reddit.com/r/{subreddit}/top.json
    - https://www.reddit.com/r/{subreddit}/comments/{post_id}.json
    """

    def __init__(self, user_agent: str = "LexTrackAI Monitor Dashboard/1.0"):
        self.user_agent = user_agent
        self.headers = {
            'User-Agent': user_agent
        }
        self.base_url = "https://www.reddit.com"

    def fetch_subreddit_posts(
        self,
        subreddit: str,
        sort: str = "new",
        limit: int = 25,
        time_filter: str = "all"
    ) -> List[Dict[str, Any]]:
        """
        Fetch posts from a subreddit.

        Args:
            subreddit: Subreddit name (without r/)
            sort: 'new', 'hot', 'top', 'rising'
            limit: Number of posts to fetch (max 100)
            time_filter: 'hour', 'day', 'week', 'month', 'year', 'all' (for 'top' sort)

        Returns:
            List of post dictionaries
        """
        url = f"{self.base_url}/r/{subreddit}/{sort}.json"
        params = {
            'limit': min(limit, 100)  # Reddit max is 100
        }

        if sort == 'top':
            params['t'] = time_filter

        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            posts = []

            for child in data.get('data', {}).get('children', []):
                post_data = child.get('data', {})
                posts.append(post_data)

            return posts

        except requests.RequestException as e:
            print(f"Error fetching posts from r/{subreddit}: {e}")
            return []

    def fetch_post_comments(self, subreddit: str, post_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch comments for a specific post.

        Args:
            subreddit: Subreddit name
            post_id: Post ID
            limit: Max number of comments to fetch

        Returns:
            List of comment dictionaries
        """
        url = f"{self.base_url}/r/{subreddit}/comments/{post_id}.json"
        params = {
            'limit': limit,
            'depth': 1  # Only fetch top-level comments
        }

        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            # Comments are in the second element of the response
            if len(data) < 2:
                return []

            comments = []
            for child in data[1].get('data', {}).get('children', []):
                comment_data = child.get('data', {})
                # Skip "more" comments objects
                if comment_data.get('kind') != 'more':
                    comments.append(comment_data)

            return comments

        except requests.RequestException as e:
            print(f"Error fetching comments for post {post_id}: {e}")
            return []

    def convert_to_reddit_post(self, post_data: Dict[str, Any], include_comments: bool = True) -> RedditPost:
        """
        Convert Reddit API data to RedditPost model.

        Args:
            post_data: Raw post data from Reddit API
            include_comments: Whether to fetch and include comments

        Returns:
            RedditPost object
        """
        post_id = post_data.get('id', '')
        subreddit = post_data.get('subreddit', '')

        # Fetch comments if requested
        comments = []
        if include_comments and post_id and subreddit:
            time.sleep(1)  # Rate limiting - be respectful to Reddit
            comment_data_list = self.fetch_post_comments(subreddit, post_id)

            for comment_data in comment_data_list:
                try:
                    comment = Comment(
                        id=comment_data.get('id', ''),
                        author=comment_data.get('author', '[deleted]'),
                        body=comment_data.get('body', ''),
                        score=comment_data.get('score', 0),
                        created_utc=comment_data.get('created_utc', 0)
                    )
                    comments.append(comment)
                except Exception as e:
                    print(f"Error converting comment: {e}")
                    continue

        # Create RedditPost
        return RedditPost(
            id=post_id,
            subreddit=subreddit,
            title=post_data.get('title', ''),
            body=post_data.get('selftext', ''),
            author=post_data.get('author', '[deleted]'),
            url=f"https://reddit.com{post_data.get('permalink', '')}",
            score=post_data.get('score', 0),
            num_comments=post_data.get('num_comments', 0),
            upvote_ratio=post_data.get('upvote_ratio', 0.5),
            created_utc=post_data.get('created_utc', 0),
            comments=comments
        )

    def fetch_and_convert_posts(
        self,
        subreddit: str,
        sort: str = "new",
        limit: int = 10,
        include_comments: bool = True
    ) -> List[RedditPost]:
        """
        Fetch posts from a subreddit and convert to RedditPost models.

        Args:
            subreddit: Subreddit name
            sort: Sort method
            limit: Number of posts
            include_comments: Whether to fetch comments

        Returns:
            List of RedditPost objects
        """
        print(f"Fetching {limit} posts from r/{subreddit}...")
        posts_data = self.fetch_subreddit_posts(subreddit, sort, limit)

        reddit_posts = []
        for i, post_data in enumerate(posts_data[:limit], 1):
            print(f"Processing post {i}/{limit}...")
            try:
                reddit_post = self.convert_to_reddit_post(post_data, include_comments)
                reddit_posts.append(reddit_post)

                # Rate limiting - be nice to Reddit
                if include_comments:
                    time.sleep(2)  # Wait 2 seconds between posts

            except Exception as e:
                print(f"Error processing post: {e}")
                continue

        print(f"Successfully fetched {len(reddit_posts)} posts")
        return reddit_posts

    def save_posts_to_json(self, posts: List[RedditPost], filepath: str):
        """
        Save RedditPost objects to a JSON file.

        Args:
            posts: List of RedditPost objects
            filepath: Path to save the JSON file
        """
        posts_dict = {
            "posts": [post.model_dump() for post in posts]
        }

        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(posts_dict, f, indent=2, ensure_ascii=False)

        print(f"Saved {len(posts)} posts to {filepath}")

    def fetch_multiple_subreddits(
        self,
        subreddits: List[str],
        posts_per_subreddit: int = 5,
        include_comments: bool = True
    ) -> Dict[str, List[RedditPost]]:
        """
        Fetch posts from multiple subreddits.

        Args:
            subreddits: List of subreddit names
            posts_per_subreddit: Number of posts to fetch per subreddit
            include_comments: Whether to fetch comments

        Returns:
            Dictionary mapping subreddit names to lists of RedditPost objects
        """
        results = {}

        for subreddit in subreddits:
            print(f"\n=== Fetching from r/{subreddit} ===")
            posts = self.fetch_and_convert_posts(
                subreddit,
                sort="hot",
                limit=posts_per_subreddit,
                include_comments=include_comments
            )
            results[subreddit] = posts

            # Wait between subreddits
            if subreddit != subreddits[-1]:
                print("Waiting before next subreddit...")
                time.sleep(3)

        return results
