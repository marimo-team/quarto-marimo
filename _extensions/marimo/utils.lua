-- utils
local stringify = pandoc.utils.stringify
local file_path = debug.getinfo(1, "S").source:sub(2)
local file_dir = file_path:match("(.*[/\\])")

function is_mime_sensitive()
    -- Determine whether we can render the html tags that island produces. If
    -- not, this flag will let's us directly output a representative value.
    local output_file = PANDOC_STATE.output_file
    return string.match(output_file, "%.pdf$")
        or string.match(output_file, "%.tex$")
end

-- Isn't lua awful.
function concat_lists(...)
    local result = {}
    for i = 1, select("#", ...) do
        local t = select(i, ...)
        for j = 1, #t do
            result[#result + 1] = t[j]
        end
    end
    return result
end

-- Function to extract text from a Pandoc Para object
-- which is a deeply nested monad.
local function extract_text(para)
    local text = ""
    -- If a table is passed, we need to iterate over its elements
    for _, el in ipairs(para) do
        if el.t == "Para" then
            -- Recursively extract text from nested Para elements
            text = text .. extract_text(el.content)
        elseif el.t == "Str" then
            text = text .. el.text -- Add the string content
        elseif el.t == "Space" then
            text = text .. " " -- Add space
        elseif el.t == "SoftBreak" then
            text = text .. "\n" -- Add newline for SoftBreak
        elseif el.t == "Quoted" then
            -- Handle Quoted elements, extract the inner string
            for _, q_el in ipairs(el.content) do
                if q_el.t == "Str" then
                    text = text .. '"' .. q_el.text .. '"'
                end
            end
        end
    end
    return text
end

-- Construct the full UV command given:
function _construct_uv_command(header)
    local command_script = file_dir .. "command.py"
    return pandoc.json.decode(
        pandoc.pipe(
            "uv",
            { "run", "--with", "marimo==0.14.16", command_script },
            header
        )
    )
end

function run_marimo(meta)
    local endpoint_script = file_dir .. "extract.py"

    -- PDFs / LaTeX have to be handled specifically for mimetypes
    -- Need to pass in a string as arg in python invocation.
    local mime_sensitive = "no"
    if is_mime_sensitive(doc) then
        mime_sensitive = "yes"
    end

    local command = "uv"
    local args = {}
    if meta["external-env"] ~= nil then
        assert(
            meta["external-env"] == true,
            "The external-env meta key must be set to true or omitted"
        )
        assert(
            meta["pyproject"] == nil,
            "The pyproject meta key must be omitted when using external-env"
        )
        args = { "run", endpoint_script }
    elseif meta["pyproject"] ~= nil then
        header = extract_text(meta["pyproject"])
        args = concat_lists(_construct_uv_command(header), { endpoint_script })
    elseif meta["header"] ~= nil then
        header = extract_text(meta["header"])
        args = concat_lists(_construct_uv_command(header), { endpoint_script })
    else
        args = concat_lists(_construct_uv_command(""), { endpoint_script })
    end

    local parsed_data = {}
    local result = {}
    for _, filename in ipairs(PANDOC_STATE.input_files) do
        local input_file = io.open(filename, "r")
        if input_file then
            local text = input_file:read("*all")
            input_file:close()

            text = text or ""

            -- Parse the input file using the external Python script
            default_args = { filename, mime_sensitive }
            result = pandoc.json.decode(
                pandoc.pipe(command, concat_lists(args, default_args), text)
            )
            -- Concatenate the result arrays
            for _, item in ipairs(result["outputs"]) do
                table.insert(parsed_data, item)
            end
        end
    end
    result["outputs"] = parsed_data
    return result
end

return {
    is_mime_sensitive = is_mime_sensitive,
    run_marimo = run_marimo,
}
