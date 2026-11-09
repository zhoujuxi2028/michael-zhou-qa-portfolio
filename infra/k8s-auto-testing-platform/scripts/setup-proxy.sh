#!/bin/bash

# K8S Auto Testing Platform - Proxy Configuration
# Configures shell to bypass proxy for K8S and local connections

# Proxy bypass settings
PROXY_BYPASS="localhost,127.0.0.1,kubernetes.docker.internal,10.0.0.0/8,192.168.0.0/16"

echo "Setting up proxy bypass for K8S..."

# Detect shell config file
if [[ -f ~/.zshrc ]]; then
    SHELL_RC=~/.zshrc
elif [[ -f ~/.bashrc ]]; then
    SHELL_RC=~/.bashrc
else
    SHELL_RC=~/.profile
fi

# Check if already configured
if grep -q "K8S_PROXY_BYPASS" "$SHELL_RC" 2>/dev/null; then
    echo "Proxy bypass already configured in $SHELL_RC"
else
    echo "" >> "$SHELL_RC"
    echo "# K8S_PROXY_BYPASS - Added by K8S Auto Testing Platform" >> "$SHELL_RC"
    echo "export no_proxy=\"$PROXY_BYPASS\"" >> "$SHELL_RC"
    echo "export NO_PROXY=\"$PROXY_BYPASS\"" >> "$SHELL_RC"
    echo "Proxy bypass added to $SHELL_RC"
fi

# Apply to current session
export no_proxy="$PROXY_BYPASS"
export NO_PROXY="$PROXY_BYPASS"

echo ""
echo "Proxy bypass configured:"
echo "  no_proxy=$PROXY_BYPASS"
echo ""
echo "To apply to current session, run:"
echo "  source $SHELL_RC"
echo ""
echo "Or restart your terminal."
