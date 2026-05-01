#!/bin/bash
# Script to automate updating the test report on GitHub Pages

echo "Step 1: Committing changes to main..."
git add .
git commit -m "Update tests and report"
git push origin main

echo "Step 2: Pushing report folder to gh-pages branch..."
git subtree push --prefix "VHREU E2E/report" origin gh-pages

echo "Done! Your report is being deployed to GitHub Pages."
