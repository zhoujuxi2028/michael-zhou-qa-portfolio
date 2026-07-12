*** Settings ***
Library    SeleniumLibrary
Library    Collections
Library    String

*** Variables ***
${BROWSER}              chrome
${SELENIUM_GRID}        http://localhost:4444/wd/hub
${IMPLICIT_WAIT}        10s
${PAGE_LOAD_TIMEOUT}    30s

*** Keywords ***
Open Browser To Grid
    [Arguments]    ${url}    ${browser}=${BROWSER}
    Open Browser    ${url}    ${browser}    remote_url=${SELENIUM_GRID}
    Set Selenium Implicit Wait    ${IMPLICIT_WAIT}
    Set Selenium Speed    0.1s

Close Browser Safely
    Run Keyword And Ignore Error    Close All Browsers

Verify Page Title Contains
    [Arguments]    ${expected}
    ${title}=    Get Title
    Should Contain    ${title}    ${expected}

Wait And Click Element
    [Arguments]    ${locator}
    Wait Until Element Is Visible    ${locator}    timeout=${IMPLICIT_WAIT}
    Click Element    ${locator}

Wait And Input Text
    [Arguments]    ${locator}    ${text}
    Wait Until Element Is Visible    ${locator}    timeout=${IMPLICIT_WAIT}
    Input Text    ${locator}    ${text}

Element Should Be Present
    [Arguments]    ${locator}
    Wait Until Page Contains Element    ${locator}    timeout=${IMPLICIT_WAIT}
