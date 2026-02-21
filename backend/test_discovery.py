"""
Quick terminal test for subreddit discovery.
Run: python test_discovery.py
"""
from services.subreddit_discovery import discover_subreddits
from models.schemas import ProductInput

test_products = [
    ProductInput(
        product_name="FitMatch",
        product_description="A niche dating app for gym and fitness enthusiasts",
        niche_category="Fitness & Dating",
        target_audience="Gym-goers aged 20-35",
        keywords=["gym dating", "fitness singles", "workout partner"]
    ),
    ProductInput(
        product_name="ChefAI",
        product_description="An AI meal planning app that creates personalized recipes based on dietary restrictions and fitness goals",
        niche_category="Food Tech & Health",
        target_audience="Health-conscious home cooks aged 25-45",
        keywords=["meal planning", "healthy recipes", "diet app", "macro tracking"]
    ),
    ProductInput(
        product_name="PetBnB",
        product_description="A marketplace connecting pet owners with trusted local pet sitters for overnight stays",
        niche_category="Pet Services",
        target_audience="Dog and cat owners who travel frequently",
        keywords=["pet sitting", "dog boarding", "pet care", "travel with pets"]
    ),
]

if __name__ == "__main__":
    for product in test_products:
        print(f"\n{'='*60}")
        print(f"Testing: {product.product_name}")
        print(f"{'='*60}")

        try:
            result = discover_subreddits(product)
            for i, sub in enumerate(result.subreddits, 1):
                print(f"\n  {i}. {sub.name}")
                print(f"     {sub.url}")
                print(f"     > {sub.reason}")
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\n{'='*60}")
    print("Done!")
