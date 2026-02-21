#!/usr/bin/env python3
"""
Fetch subreddit titles and descriptions using Reddit's public JSON endpoints.
This script collects an exhaustive list of subreddits by crawling through
popular, new, and various category listings.
"""

import json
import time
import requests
from typing import List, Dict, Set
from datetime import datetime


class SubredditFetcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SubredditCrawler/1.0'
        })
        self.subreddits = {}
        self.visited = set()

    def fetch_json(self, url: str, params: Dict = None) -> Dict:
        """Fetch JSON data from Reddit with rate limiting."""
        try:
            time.sleep(2)  # Rate limiting - 2 seconds between requests
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None

    def extract_subreddit_info(self, post_data: Dict) -> None:
        """Extract subreddit information from a post."""
        try:
            subreddit = post_data.get('subreddit')
            subreddit_id = post_data.get('subreddit_id')

            if subreddit and subreddit_id and subreddit_id not in self.visited:
                self.visited.add(subreddit_id)

                # Fetch detailed subreddit info
                subreddit_url = f"https://www.reddit.com/r/{subreddit}/about.json"
                subreddit_data = self.fetch_json(subreddit_url)

                if subreddit_data and 'data' in subreddit_data:
                    data = subreddit_data['data']
                    self.subreddits[subreddit] = {
                        'name': subreddit,
                        'title': data.get('title', ''),
                        'description': data.get('public_description', ''),
                        'subscribers': data.get('subscribers', 0),
                        'created_utc': data.get('created_utc', 0),
                        'over18': data.get('over18', False),
                        'url': f"https://www.reddit.com/r/{subreddit}"
                    }
                    print(f"Added: r/{subreddit} - {self.subreddits[subreddit]['title']}")
        except Exception as e:
            print(f"Error extracting subreddit info: {e}")

    def fetch_listing(self, url: str, limit: int = 100) -> None:
        """Fetch posts from a listing and extract subreddit information."""
        after = None
        pages = 0
        max_pages = 10  # Limit pages per listing to avoid infinite loops

        while pages < max_pages:
            params = {'limit': limit}
            if after:
                params['after'] = after

            data = self.fetch_json(url, params)
            if not data or 'data' not in data:
                break

            children = data['data'].get('children', [])
            if not children:
                break

            for child in children:
                if child.get('kind') == 't3':  # Post
                    self.extract_subreddit_info(child.get('data', {}))

            after = data['data'].get('after')
            if not after:
                break

            pages += 1
            print(f"Processed page {pages} of {url}")

    def fetch_subreddit_list(self, category: str, limit: int = 100) -> None:
        """Fetch subreddits from a specific category listing."""
        url = f"https://www.reddit.com/subreddits/{category}.json"
        after = None
        pages = 0
        max_pages = 10

        print(f"\nFetching from category: {category}")

        while pages < max_pages:
            params = {'limit': limit}
            if after:
                params['after'] = after

            data = self.fetch_json(url, params)
            if not data or 'data' not in data:
                break

            children = data['data'].get('children', [])
            if not children:
                break

            for child in children:
                if child.get('kind') == 't5':  # Subreddit
                    subreddit_data = child.get('data', {})
                    subreddit = subreddit_data.get('display_name')
                    subreddit_id = subreddit_data.get('id')

                    if subreddit and subreddit_id and subreddit_id not in self.visited:
                        self.visited.add(subreddit_id)
                        self.subreddits[subreddit] = {
                            'name': subreddit,
                            'title': subreddit_data.get('title', ''),
                            'description': subreddit_data.get('public_description', ''),
                            'subscribers': subreddit_data.get('subscribers', 0),
                            'created_utc': subreddit_data.get('created_utc', 0),
                            'over18': subreddit_data.get('over18', False),
                            'url': f"https://www.reddit.com/r/{subreddit}"
                        }
                        print(f"Added: r/{subreddit} - {self.subreddits[subreddit]['title']}")

            after = data['data'].get('after')
            if not after:
                break

            pages += 1
            print(f"Processed page {pages} of {category}")

    def fetch_all_subreddits(self) -> None:
        """Fetch subreddits from multiple sources."""
        print("Starting subreddit collection...")
        print("=" * 60)

        # Fetch from subreddit listings
        categories = ['popular', 'new', 'default']
        for category in categories:
            self.fetch_subreddit_list(category)

        # Fetch from popular posts to discover more subreddits
        print("\nFetching from r/all...")
        self.fetch_listing('https://www.reddit.com/r/all.json')

        print("\nFetching from r/popular...")
        self.fetch_listing('https://www.reddit.com/r/popular.json')

        print("\n" + "=" * 60)
        print(f"Total subreddits collected: {len(self.subreddits)}")

    def save_to_file(self, filename: str = 'subreddits.json') -> None:
        """Save collected subreddits to a JSON file."""
        output = {
            'metadata': {
                'total_count': len(self.subreddits),
                'collected_at': datetime.utcnow().isoformat(),
                'description': 'Subreddit titles and descriptions from Reddit public API'
            },
            'subreddits': list(self.subreddits.values())
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\nData saved to {filename}")


def main():
    """Main function to run the subreddit fetcher."""
    fetcher = SubredditFetcher()

    try:
        fetcher.fetch_all_subreddits()
        fetcher.save_to_file('subreddits.json')

        # Print sample statistics
        if fetcher.subreddits:
            sorted_subs = sorted(
                fetcher.subreddits.values(),
                key=lambda x: x.get('subscribers', 0),
                reverse=True
            )

            print("\n" + "=" * 60)
            print("Top 10 subreddits by subscribers:")
            print("=" * 60)
            for i, sub in enumerate(sorted_subs[:10], 1):
                print(f"{i}. r/{sub['name']} - {sub['subscribers']:,} subscribers")
                print(f"   Title: {sub['title']}")
                print(f"   Description: {sub['description'][:100]}...")
                print()

    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Saving collected data...")
        fetcher.save_to_file('subreddits_partial.json')
    except Exception as e:
        print(f"\nError occurred: {e}")
        print("Saving collected data...")
        fetcher.save_to_file('subreddits_partial.json')


if __name__ == '__main__':
    main()
